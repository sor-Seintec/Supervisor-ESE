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
  const dialog=document.createElement('dialog');dialog.className='absence-dialog';
  dialog.innerHTML='<form><h2>Informar ausência</h2><p>Sem escola, sem aprovação e sem impacto na meta.</p><label>Motivo<select name="reason"></select></label><label>Turno<select name="shift"></select></label><label>Data inicial<input name="startDate" type="date" required></label><label>Data final<input name="endDate" type="date" required></label><label>Observação (opcional)<textarea name="notes" maxlength="800" placeholder="Não inclua diagnóstico ou CID."></textarea></label><p data-feedback role="status"></p><button type="button" data-prepare>Preparar card para arrastar</button><button type="submit">Salvar no dia escolhido</button><button type="button" data-close>Fechar</button></form>';
  document.body.append(dialog);
  const form=dialog.querySelector('form'), field=name=>form.elements.namedItem(name), feedback=dialog.querySelector('[data-feedback]');
  for(const reason of absenceReasons)field('reason').add(new Option(reason,reason));
  for(const shift of absenceShifts)field('shift').add(new Option(shift,shift));
  let editing=null, owner='', busy=false, dragging=null;
  function open(item=null) {
    if(busy)return;
    owner=currentSupervisorId();if(!owner){showToast('Selecione um supervisor.');return;}
    editing=item;
    const now=new Date(), today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    field('reason').value=item?.reason||absenceReasons[0];field('shift').value=item?.shift||'Dia inteiro';
    field('startDate').value=item?.startDate||today;field('endDate').value=item?.endDate||today;field('notes').value=item?.notes||'';
    feedback.textContent=item&&item.startDate!==item.endDate?'Alterações neste card afetam todo o período informado.':'';
    dialog.querySelector('[data-prepare]').hidden=!!item;dialog.showModal();
  }
  document.getElementById('absenceFolder').addEventListener('click',()=>open());
  dialog.querySelector('[data-close]').addEventListener('click',()=>{if(!busy)dialog.close();});
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  field('startDate').addEventListener('change',()=>{if(field('endDate').value<field('startDate').value)field('endDate').value=field('startDate').value;});
  const values=()=>validateAbsence({supervisorId:owner,...Object.fromEntries(new FormData(form))});
  function draggable(button,payload){
    button.draggable=true;
    button.addEventListener('dragstart',event=>{if(busy||state.saving){event.preventDefault();return;}state.dragging=null;dragging=payload;event.dataTransfer.setData('application/x-supervisor-absence','1');event.dataTransfer.effectAllowed='move';});
    button.addEventListener('dragend',()=>{dragging=null;state.dragging=null;});
  }
  dialog.querySelector('[data-prepare]').addEventListener('click',()=>{
    try{const data=values();const button=document.createElement('button');button.type='button';button.className='absence-card';button.textContent=`${data.reason}\n${data.shift}\nArraste para o dia desejado ou clique para escolher a data.`;
      draggable(button,{data,owner,sourceDay:data.startDate});button.addEventListener('click',()=>open(data));document.getElementById('absenceTemplate').replaceChildren(button);dialog.close();
    }catch(error){feedback.textContent=error.message;}
  });
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
