(()=>{
  'use strict';
  const VERSION='1';
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  let correctionDemo;
  const correctionTrigger=()=>document.querySelector('.badge-status.is-correctable');
  function ensureCorrectionDemo(){
    if(correctionDemo)return correctionDemo;
    correctionDemo=document.createElement('div');
    correctionDemo.className='ese-correction-demo';
    correctionDemo.hidden=true;
    correctionDemo.innerHTML=`<section class="ese-correction-demo-dialog" aria-label="Demonstração da correção de status">
      <header><div><p>Revisão do registro</p><h2>Solicitar correção de status</h2></div><span class="ese-correction-demo-close">×</span></header>
      <div class="ese-correction-demo-body">
        <div class="ese-correction-demo-summary"><span><small>Escola</small><strong>Escola selecionada</strong></span><span><small>Data da visita</small><strong>dd/mm/aaaa</strong></span><span><small>Status registrado</small><strong>Visitada</strong></span><span><small>Supervisor</small><strong>Usuário atual</strong></span></div>
        <label>Novo status solicitado<select class="ese-correction-demo-status" disabled><option>Selecione o status correto</option></select></label>
        <label>Motivo da correção<textarea class="ese-correction-demo-reason" disabled placeholder="Explique o que foi registrado incorretamente e por que o status deve ser alterado."></textarea></label>
        <p class="ese-correction-demo-note">O status atual continuará valendo até a análise do Gestor-ESE.</p>
      </div>
      <footer class="ese-correction-demo-actions"><button type="button" disabled>Voltar</button><button type="button" disabled>Enviar para análise</button></footer>
    </section>`;
    document.body.appendChild(correctionDemo);
    return correctionDemo;
  }
  function showCorrectionDemo(){ensureCorrectionDemo().hidden=false}
  function hideCorrectionDemo(){if(correctionDemo)correctionDemo.hidden=true}
  const configs={
    'index.html':[
      {selector:'#loginView',title:'Acesso ao Supervisor-ESE',text:'Entre usando o identificador fornecido pela gestão e sua senha.'},
      {selector:'#email',title:'Usuário de acesso',text:'Digite somente o usuário recebido, por exemplo supteste. Não é necessário informar o endereço de e-mail completo.'},
      {selector:'#password',title:'Senha',text:'Informe sua senha com atenção. Por segurança, ela não é exibida na tela.'},
      {selector:'#loginButton',title:'Entrar no sistema',text:'Depois de preencher os dois campos, use este botão para validar seu acesso.'},
      {selector:'#profileView',title:'Seu painel de trabalho',text:'Este é o ponto de partida depois do login. Aqui você acompanha escolas, visitas e os próximos compromissos.'},
      {selector:'.profile-mini',title:'Seu perfil',text:'Confirme seu nome, perfil de acesso e usuário antes de iniciar o trabalho.'},
      {selector:'.data-summary',title:'Resumo das atividades',text:'Estes indicadores mostram escolas vinculadas, visitas concluídas e agendamentos.'},
      {selector:'#upcomingVisits',title:'Próximas visitas',text:'Consulte rapidamente as escolas programadas para hoje e para o próximo dia útil.'},
      {selector:'.dashboard-actions',title:'Ações principais',text:'Use estes atalhos para registrar uma visita, organizar o planejamento ou sair do sistema.'},
      {selector:'#themePickerButton',title:'Personalize as cores',text:'Escolha uma paleta mais confortável para sua leitura. A preferência vale também nas outras páginas.'}
    ],
    'visita.html':[
      {selector:'.top-actions',title:'Menu de navegação',text:'Use Voltar ao Portal para retornar à página principal e Planejamento para organizar o calendário de visitas.'},
      {selector:'#sidebarAccount',title:'Conta e saída',text:'Na parte inferior do menu aparecem seu nome e perfil. O ícone de saída encerra o acesso com segurança.',tip:'Sempre use esta opção ao terminar, principalmente em computadores compartilhados.'},
      {selector:'.intro',title:'Registrar visita escolar',text:'Nesta página você confirma uma visita planejada ou registra diretamente uma atividade realizada.'},
      {selector:'.steps',title:'Etapas do registro',text:'O formulário foi organizado em visita, atividade, resultado e confirmação.'},
      {selector:'#sourceMode',title:'Escolha a origem',text:'Use “Do planejamento” para uma visita já agendada ou “Registro direto” para qualquer escola da rede.'},
      {selector:'#agendaPicker',title:'Selecione o planejamento',text:'Navegue pelas datas e escolha a escola que será confirmada.'},
      {selector:'#sourceMode',prepare:()=>document.querySelector('[data-source="direct"]')?.click(),title:'Registro direto',text:'O registro direto permite informar uma atividade realizada mesmo quando ela não estava no planejamento. Nesta opção, todas as escolas da rede ficam disponíveis.'},
      {selector:'#schoolSelect',title:'Escolha qualquer escola',text:'Selecione a escola onde a atividade aconteceu. No registro direto, a escolha não fica limitada às escolas vinculadas ao supervisor.'},
      {selector:'#catalogPanel',prepare:()=>document.querySelector('[data-source="direct"]')?.click(),title:'Pastas de ações no registro direto',text:'Escolha uma ou mais ações realizadas na escola. Use a pesquisa para localizar rapidamente uma atividade na lista.'},
      {selector:'#activityMode',prepare:()=>document.querySelector('[data-source="planned"]')?.click(),title:'Atividade da visita planejada',text:'Em uma visita planejada, você pode registrar um acompanhamento simples ou abrir a relação de ações cadastradas.'},
      {selector:'#catalogPanel',prepare:()=>document.querySelector('[data-activity="catalog"]')?.click(),title:'Ações cadastradas',text:'Marque todas as ações que realmente foram realizadas. É possível selecionar mais de uma opção e pesquisar pelo nome.'},
      {selector:'#notes',title:'Resumo da atividade',text:'Este campo é opcional e pode registrar observações, encaminhamentos e próximos passos importantes para a gestão.'},
      {selector:'#statusGrid',title:'Resultado da visita',text:'Escolha o resultado correto: Realizada para visita concluída, Adiada quando será reagendada, Cancelada quando não aconteceu ou Justificar meta para explicar uma meta não atingida.',tip:'Atenção: use Justificar meta (J) somente quando precisar informar por que a meta de visitas não foi atingida. Não use esse status no lugar de Adiada ou Cancelada.'},
      {selector:'.legend',title:'Entenda os status',text:'A legenda lateral apresenta o padrão usado em todo o portal: P planejada, V visitada, J justificada, A adiada e C cancelada.'},
      {selector:'.submit-row',title:'Revise e confirme',text:'Confira os dados antes de salvar. O registro ficará associado automaticamente ao seu usuário.'}
    ],
    'kanban.html':[
      {selector:'.header',title:'Planejamento semanal',text:'Organize aqui as visitas que pretende realizar durante a semana.'},
      {selector:'.toolbar',title:'Período e responsável',text:'Escolha ano, mês e semana. Para supervisores, o responsável é definido automaticamente pelo login.'},
      {selector:'.sidebar',title:'Escolas disponíveis',text:'Estas são as escolas vinculadas ao responsável selecionado. Arraste um cartão para o dia desejado.'},
      {selector:'.calendar-container',title:'Calendário de visitas',text:'Distribua as escolas pelos dias. Um cartão planejado pode ser movido para outra data.'},
      {selector:'.status-legend',title:'Padrão de status',text:'Consulte as letras e cores usadas para identificar planejamento, visita, justificativa, adiamento e cancelamento.'},
      {selector:'.badge-status.is-correctable',condition:correctionTrigger,title:'Status já registrado',text:'Quando uma visita já possui resultado, a letra colorida no cartão pode ser selecionada para solicitar uma correção.',tip:'Use a correção somente quando o status tiver sido informado incorretamente.'},
      {selector:'.ese-correction-demo-summary',condition:correctionTrigger,prepare:showCorrectionDemo,title:'Conferência do registro',text:'Esta é apenas uma demonstração. Antes de pedir a alteração, confira a escola, a data, o status registrado e o supervisor responsável.'},
      {selector:'.ese-correction-demo-status',condition:correctionTrigger,prepare:showCorrectionDemo,title:'Novo status solicitado',text:'Escolha qual deveria ser o resultado correto. Durante o Tour este campo fica bloqueado e não altera nenhum registro.'},
      {selector:'.ese-correction-demo-reason',condition:correctionTrigger,prepare:showCorrectionDemo,title:'Motivo obrigatório',text:'Explique claramente o erro e por que o status precisa ser alterado. No Tour, não é necessário preencher este campo.'},
      {selector:'.ese-correction-demo-note',condition:correctionTrigger,prepare:showCorrectionDemo,title:'Aguardar análise',text:'O status original continuará valendo nos indicadores até que o Gestor-ESE aprove a correção.'},
      {selector:'.ese-correction-demo-actions',condition:correctionTrigger,prepare:showCorrectionDemo,title:'Enviar para análise',text:'No uso real, este botão registra a solicitação para o gestor. Nesta demonstração os botões estão desativados e nada será enviado.'},
      {selector:'.header-register',prepare:hideCorrectionDemo,title:'Registrar visita',text:'Depois da atividade na escola, use este botão para confirmar o resultado da visita.'}
    ]
  };
  let steps=[],index=0,active=false,shades=[],focus,tooltip;
  const icon='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.4 2.2c-.8.4-1.2.9-1.2 1.8M12 17h.01"/></svg>';
  const visible=el=>el&&!el.hidden&&el.getClientRects().length>0;
  const currentSteps=()=> (configs[page]||configs['index.html']).map(item=>({...item,element:document.querySelector(item.selector)})).filter(item=>item.element&&(!item.condition||item.condition())&&(item.prepare||visible(item.element)));
  const storageKey=()=>`supervisor-ese-tour:${document.body.dataset.tourUser||'usuario'}:v${VERSION}`;
  function removeTour(){shades.forEach(el=>el.remove());shades=[];focus?.remove();tooltip?.remove();focus=tooltip=null;active=false;document.removeEventListener('keydown',onKey);hideCorrectionDemo()}
  function close(completed=false){if(completed){try{localStorage.setItem(storageKey(),'completed')}catch(_){}}removeTour()}
  function onKey(event){if(event.key==='Escape')close();if(event.key==='ArrowRight'){event.preventDefault();next()}if(event.key==='ArrowLeft'){event.preventDefault();previous()}}
  function ensureLayer(){if(shades.length)return;shades=Array.from({length:4},()=>{const el=document.createElement('div');el.className='ese-tour-shade';document.body.appendChild(el);return el});focus=document.createElement('div');focus.className='ese-tour-focus';document.body.appendChild(focus);tooltip=document.createElement('section');tooltip.className='ese-tour-tooltip';tooltip.setAttribute('role','dialog');tooltip.setAttribute('aria-modal','true');document.body.appendChild(tooltip)}
  function position(){if(!active||!steps[index])return;const rect=steps[index].element.getBoundingClientRect(),pad=7,w=innerWidth,h=innerHeight,left=Math.max(0,rect.left-pad),top=Math.max(0,rect.top-pad),right=Math.min(w,rect.right+pad),bottom=Math.min(h,rect.bottom+pad);Object.assign(shades[0].style,{left:'0',top:'0',width:'100%',height:`${top}px`});Object.assign(shades[1].style,{left:'0',top:`${top}px`,width:`${left}px`,height:`${bottom-top}px`});Object.assign(shades[2].style,{left:`${right}px`,top:`${top}px`,width:`${w-right}px`,height:`${bottom-top}px`});Object.assign(shades[3].style,{left:'0',top:`${bottom}px`,width:'100%',height:`${h-bottom}px`});Object.assign(focus.style,{left:`${left}px`,top:`${top}px`,width:`${Math.max(0,right-left)}px`,height:`${Math.max(0,bottom-top)}px`});const tipRect=tooltip.getBoundingClientRect(),spaceBelow=h-bottom,tipTop=spaceBelow>tipRect.height+18?bottom+12:Math.max(12,top-tipRect.height-12),tipLeft=Math.min(Math.max(12,left),w-tipRect.width-12);Object.assign(tooltip.style,{left:`${tipLeft}px`,top:`${tipTop}px`})}
  function render(){const step=steps[index];if(!step)return;step.prepare?.();step.element.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});tooltip.innerHTML=`<button class="ese-tour-close" type="button" aria-label="Fechar guia">×</button><p class="kicker">Manual interativo</p><h2>${step.title}</h2><p>${step.text}</p>${step.tip?`<p class="tip">${step.tip}</p>`:''}<div class="ese-tour-actions"><span class="ese-tour-count">${index+1} de ${steps.length}</span><button class="ese-tour-nav" data-action="previous" type="button" ${index===0?'disabled':''}>Anterior</button><button class="ese-tour-nav primary" data-action="next" type="button">${index===steps.length-1?'Concluir':'Próximo'}</button></div>`;tooltip.querySelector('.ese-tour-close').onclick=()=>close();tooltip.querySelector('[data-action="previous"]').onclick=previous;tooltip.querySelector('[data-action="next"]').onclick=next;setTimeout(position,260)}
  function start(){removeTour();if(page==='kanban.html'&&correctionTrigger())ensureCorrectionDemo();steps=currentSteps();if(!steps.length)return;active=true;index=0;ensureLayer();document.addEventListener('keydown',onKey);render()}
  function next(){if(index>=steps.length-1){close(true);return}index++;render()}
  function previous(){if(index>0){index--;render()}}
  function showWelcome(){if(document.querySelector('.ese-welcome-backdrop'))return;const layer=document.createElement('div');layer.className='ese-welcome-backdrop';layer.innerHTML='<section class="ese-welcome" role="dialog" aria-modal="true" aria-labelledby="eseWelcomeTitle"><div class="ese-welcome-icon">?</div><p class="kicker">Bem-vindo ao Supervisor-ESE</p><h2 id="eseWelcomeTitle">Deseja conhecer o sistema?</h2><p>Preparamos um guia rápido para mostrar as principais funções. Você pode iniciar agora ou acessar novamente pelo botão <strong>Ajuda / Tour</strong>.</p><div class="ese-welcome-actions"><button type="button" data-choice="later">Fazer depois</button><button class="primary" type="button" data-choice="start">Iniciar tour</button></div></section>';document.body.appendChild(layer);layer.querySelector('[data-choice="later"]').onclick=()=>{try{localStorage.setItem(storageKey(),'later')}catch(_){}layer.remove()};layer.querySelector('[data-choice="start"]').onclick=()=>{layer.remove();start()}}
  function offerFirstTour(){if(page!=='index.html'||!visible(document.querySelector('#profileView')))return;try{if(localStorage.getItem(storageKey()))return}catch(_){}showWelcome()}
  function mount(){const help=document.createElement('button');help.type='button';help.className='ese-help-button';help.innerHTML=`${icon}<span>Ajuda / Tour</span>`;help.setAttribute('aria-haspopup','menu');const menu=document.createElement('div');menu.className='ese-tour-menu';menu.hidden=true;menu.innerHTML='<strong>Manual interativo</strong><button type="button">Iniciar guia desta tela</button>';document.body.append(menu,help);help.onclick=()=>{menu.hidden=!menu.hidden};menu.querySelector('button').onclick=()=>{menu.hidden=true;start()};document.addEventListener('click',event=>{if(!menu.hidden&&!menu.contains(event.target)&&!help.contains(event.target))menu.hidden=true});addEventListener('resize',position,{passive:true});addEventListener('scroll',position,{passive:true});const profile=document.querySelector('#profileView');if(profile){new MutationObserver(offerFirstTour).observe(profile,{attributes:true,attributeFilter:['hidden']});const observer=new MutationObserver(offerFirstTour);observer.observe(document.body,{attributes:true,attributeFilter:['data-tour-user']});offerFirstTour()}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
  window.SupervisorESETour={start,close};
})();
