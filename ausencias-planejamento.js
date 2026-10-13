import {collection, doc, setDoc, runTransaction, serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import {absenceReasons, absenceShifts, validateAbsence, formatPeriod} from './ausencias-model.js';

export function shiftedPeriod(item, sourceDay, targetDay) {
  const delta = Date.parse(`${targetDay}T12:00:00Z`) - Date.parse(`${sourceDay}T12:00:00Z`);
  const shift = date => new Date(Date.parse(`${date}T12:00:00Z`) + delta).toISOString().slice(0,10);
  return {startDate:shift(item.startDate),endDate:shift(item.endDate)};
}

export function setupAbsencePlanning({db,state,currentSupervisorId,renderCalendar,showToast}) {
  const style=document.createElement('style');
  style.textContent='.absence-card{display:block;width:100%;text-align:left;margin-top:8px;padding:12px;border:1px solid #efbdc5;border-radius:10px;background:#fff0f3;color:#913142;cursor:grab;font:inherit;font-size:12px;white-space:pre-line}.absence-dialog{width:min(480px,94vw);max-height:90vh;overflow:auto;border:1px solid #efbdc5;border-radius:16px;padding:24px;color:#305770}.absence-dialog::backdrop{background:#16334588}.absence-dialog label{display:block;margin:12px 0;font-weight:600}.absence-dialog input,.absence-dialog select,.absence-dialog textarea{display:block;width:100%;box-sizing:border-box;padding:10px;margin-top:5px;border:1px solid #cbdbe5;border-radius:7px;font:inherit}.absence-dialog button{padding:10px;margin:5px;border:1px solid #efbdc5;border-radius:8px;background:#fce4e8;color:#913142;cursor:pointer}.absence-dialog button:disabled{opacity:.5;cursor:wait}';
  document.head.append(style);
  style.textContent += '.absence-card{background:radial-gradient(ellipse at 15% 20%,#f2a7b449,transparent 65%),radial-gradient(ellipse at 90% 80%,#dc6f8340,transparent 60%),linear-gradient(135deg,#fff5f6,#fbdde4);border-color:#e9acb8;box-shadow:0 3px 9px #9131420b}.absence-gallery{position:fixed;inset:auto 22px 22px auto;margin:0;width:min(440px,calc(100vw - 32px));max-height:80vh;z-index:10030;box-shadow:0 15px 55px #30577040}.absence-gallery[hidden]{display:none!important}.absence-gallery-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.absence-gallery-head h2{margin:0;font-size:20px}.absence-gallery-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.absence-gallery .absence-mini{margin:0;min-height:76px;font-weight:700;line-height:1.35;color:#913142;text-align:left;cursor:grab;background:radial-gradient(ellipse at 10% 20%,#eda3b152,transparent 65%),radial-gradient(ellipse at 95% 80%,#df6c7f38,transparent 65%),linear-gradient(135deg,#fff7f8,#f9d8e1);border:1px solid #e9b4be}.absence-mini:hover{border-color:#d57f92;box-shadow:0 4px 12px #91314218}.absence-gallery-period{display:grid;grid-template-columns:1fr 100px;gap:12px}.absence-mini:focus-visible{outline:3px solid #ae425b;outline-offset:2px}@media(max-width:520px){.absence-gallery{right:16px;bottom:16px;padding:18px;max-height:85vh}}';
  const dialog=document.createElement('dialog');dialog.className='absence-dialog';
  dialog.innerHTML='<form><h2>Informar ausência</h2><label>Motivo<select name="reason"></select></label><label>Período / turno<select name="shift"></select></label><label>Data inicial<input name="startDate" type="date" required></label><label>Data final<input name="endDate" type="date" required></label><label>Observação (opcional)<textarea name="notes" maxlength="800" placeholder="Não inclua diagnóstico ou CID."></textarea></label><p data-feedback role="status"></p><button type="submit">Salvar no dia escolhido</button><button type="button" data-close>Fechar</button></form>';
  document.body.append(dialog);
  const form=dialog.querySelector('form'), field=name=>form.elements.namedItem(name), feedback=dialog.querySelector('[data-feedback]');
  for(const reason of absenceReasons)field('reason').add(new Option(reason,reason));
  for(const shift of absenceShifts)field('shift').add(new Option(shift,shift));
  let editing=null, owner='', busy=false, dragging=null;
  const gallery=document.createElement('dialog');gallery.className='absence-dialog absence-gallery';gallery.setAttribute('aria-label','Motivos de ausência');
  gallery.innerHTML='<div class="absence-gallery-head" tabindex="0" aria-label="Mover popup: arraste o título ou use as setas do teclado" title="Arraste aqui para mover o popup"><h2>Informar ausência</h2><button type="button" data-gallery-close aria-label="Fechar">×</button></div><p>Escolha o período e arraste um motivo para o dia no calendário. Você também pode clicar no card para escolher a data.</p><div class="absence-gallery-period"><label>Período / turno<select data-gallery-shift></select></label></div><div class="absence-gallery-grid"></div><p data-gallery-feedback role="status">Ausência informada · sem impacto na meta.</p>';
  document.body.append(gallery);
  const galleryShift=gallery.querySelector('[data-gallery-shift]');
  style.textContent += '.absence-gallery-period{display:block}.absence-gallery-head{cursor:move;touch-action:none;user-select:none;position:sticky;top:-24px;padding:10px 0;background:#fff;z-index:1}.absence-gallery-head:focus-visible{outline:2px solid #ae425b;outline-offset:3px}.absence-gallery-head button{cursor:pointer}';
  const handle=gallery.querySelector('.absence-gallery-head');
  let moving=null,positioned=false;
  function place(left,top){
    const rect=gallery.getBoundingClientRect(),gap=8;
    gallery.style.left=`${Math.max(gap,Math.min(left,Math.max(gap,window.innerWidth-rect.width-gap)))}px`;
    gallery.style.top=`${Math.max(gap,Math.min(top,Math.max(gap,window.innerHeight-rect.height-gap)))}px`;
    gallery.style.right='auto';gallery.style.bottom='auto';positioned=true;
  }
  handle.addEventListener('pointerdown',event=>{
    if(event.target.closest('button')||event.button!==0)return;
    const rect=gallery.getBoundingClientRect();
    moving={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};
    handle.setPointerCapture(event.pointerId);event.preventDefault();
  });
  handle.addEventListener('pointermove',event=>{
    if(moving?.id!==event.pointerId)return;
    place(moving.left+event.clientX-moving.x,moving.top+event.clientY-moving.y);
  });
  function stopMoving(event){
    if(moving?.id!==event.pointerId)return;
    moving=null;if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);
  }
  handle.addEventListener('pointerup',stopMoving);handle.addEventListener('pointercancel',stopMoving);
  handle.addEventListener('lostpointercapture',()=>moving=null);
  handle.addEventListener('keydown',event=>{
    if(event.target!==handle)return;
    const delta={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[event.key];
    if(!delta)return;
    event.preventDefault();const rect=gallery.getBoundingClientRect();place(rect.left+delta[0],rect.top+delta[1]);
  });
  window.addEventListener('resize',()=>{if(gallery.open&&positioned){const rect=gallery.getBoundingClientRect();place(rect.left,rect.top);}});
  for(const shift of absenceShifts)galleryShift.add(new Option(shift,shift));
  let galleryOwner='';
  function template(reason){
    const startDate='2026-01-01';
    const endDate=startDate;
    const data=validateAbsence({supervisorId:galleryOwner,reason,shift:galleryShift.value,startDate,endDate,notes:''});
    return {data,owner:galleryOwner,sourceDay:startDate};
  }
  function openGallery(){
    if(busy||state.saving)return;
    galleryOwner=currentSupervisorId();if(!galleryOwner){showToast('Selecione um supervisor.');return;}
    gallery.hidden=false;if(!gallery.open)gallery.show();
    if(positioned){const rect=gallery.getBoundingClientRect();place(rect.left,rect.top);}
  }
  gallery.querySelector('[data-gallery-close]').addEventListener('click',()=>gallery.close());
  for(const reason of absenceReasons){
    const button=document.createElement('button');button.type='button';button.className='absence-card absence-mini';button.textContent=reason;
    draggable(button,()=>template(reason));
    button.addEventListener('dragstart',()=>{
      if(!dragging)return;
      // Fecha o popup depois que o navegador captura o card, liberando o calendário.
      setTimeout(()=>{if(dragging)gallery.close();},0);
    });
    button.addEventListener('click',()=>{
      try{
        const payload=template(reason),now=new Date();
        const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        if(payload.owner!==currentSupervisorId())throw new Error('O supervisor mudou. Abra novamente a pasta de ausências.');
        gallery.close();open({...payload.data,...shiftedPeriod(payload.data,payload.sourceDay,today)});
      }catch(error){gallery.querySelector('[data-gallery-feedback]').textContent=error.message;}
    });
    gallery.querySelector('.absence-gallery-grid').append(button);
  }
  function open(item=null) {
    if(busy)return;
    owner=currentSupervisorId();if(!owner){showToast('Selecione um supervisor.');return;}
    editing=item;
    const now=new Date(), today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    field('reason').value=item?.reason||absenceReasons[0];field('shift').value=item?.shift||'Dia inteiro';
    field('startDate').value=item?.startDate||today;field('endDate').value=item?.endDate||today;field('notes').value=item?.notes||'';
    feedback.textContent=item&&item.startDate!==item.endDate?'Alterações neste card afetam todo o período informado.':'';
    dialog.showModal();
  }
  document.getElementById('absenceFolder').addEventListener('click',openGallery);
  dialog.querySelector('[data-close]').addEventListener('click',()=>{if(!busy)dialog.close();});
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  field('startDate').addEventListener('change',()=>{if(field('endDate').value<field('startDate').value)field('endDate').value=field('startDate').value;});
  const values=()=>validateAbsence({supervisorId:owner,...Object.fromEntries(new FormData(form))});
  function draggable(button,payload){
    button.draggable=true;
    button.addEventListener('dragstart',event=>{if(busy||state.saving){event.preventDefault();return;}try{const value=typeof payload==='function'?payload():payload;if(value.owner!==currentSupervisorId())throw new Error('O supervisor mudou. Abra novamente a pasta de ausências.');state.dragging=null;dragging=value;event.dataTransfer.setData('application/x-supervisor-absence','1');event.dataTransfer.effectAllowed='move';}catch(error){event.preventDefault();dragging=null;showToast(error.message);}});
    button.addEventListener('dragend',()=>{dragging=null;state.dragging=null;});
  }
  async function persist(data,id=null,expected=null){
    if(busy||state.saving)throw new Error('Aguarde o salvamento atual.');
    if(data.supervisorId!==currentSupervisorId())throw new Error('O supervisor mudou. Selecione novamente a ausência.');
    if(!navigator.onLine)throw new Error('Conecte-se à internet para salvar.');
    busy=true;const controls=[...form.elements].map(x=>[x,x.disabled]);controls.forEach(([x])=>x.disabled=true);
    try{
      const ref=id?doc(db,'absences',id):doc(collection(db,'absences'));
      if(id)await runTransaction(db,async tx=>{
        const snapshot=await tx.get(ref);if(!snapshot.exists())throw new Error('Ausência não encontrada. Atualize o planejamento.');
        const live=snapshot.data();if(live.supervisorId!==data.supervisorId)throw new Error('Supervisor incompatível.');
        if(expected&&['startDate','endDate','reason','shift','notes'].some(key=>live[key]!==expected[key]))throw new Error('Este registro foi alterado em outra tela. Atualize antes de continuar.');
        tx.update(ref,{reason:data.reason,shift:data.shift,startDate:data.startDate,endDate:data.endDate,notes:data.notes});
      });
      else await setDoc(ref,{...data,createdByUid:state.user.uid,createdAt:serverTimestamp()});
      if(currentSupervisorId()===data.supervisorId){state.absences=state.absences.filter(x=>x.id!==ref.id);state.absences.push({...data,id:ref.id});renderCalendar();}
      showToast('Ausência informada salva. Sem alteração na meta.');
    }finally{busy=false;controls.forEach(([x,disabled])=>x.disabled=disabled);}
  }
  function errorText(error){return error.code==='permission-denied'?'Permissão negada. Confira a regra de ausências no Firebase.':error.message;}
  form.addEventListener('submit',async event=>{event.preventDefault();try{await persist(values(),editing?.id,editing?.id?editing:null);dialog.close();}catch(error){feedback.textContent=errorText(error);}});
  function card(item,day){const button=document.createElement('button');button.type='button';button.className='absence-card';button.textContent=`Ausência informada\n${item.reason}\n${item.shift}`;button.title=`${formatPeriod(item)}. Clique para editar; arraste para mover o período inteiro.`;draggable(button,{data:item,id:item.id,owner:item.supervisorId,sourceDay:day});button.addEventListener('click',()=>open(item));return button;}
  async function drop(event,day){
    if(!dragging)return false;
    const payload=dragging;dragging=null;state.dragging=null;
    try{const data=validateAbsence({...payload.data,...shiftedPeriod(payload.data,payload.sourceDay,day)});await persist(data,payload.id,payload.id?payload.data:null);}catch(error){showToast(errorText(error));}
    return true;
  }
  window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});
  return {card,drop};
}
