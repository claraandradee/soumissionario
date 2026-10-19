(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const form = $('#form'), done = $('#done'), valor = $('#valor'), mensal = $('#mensal');
  const steps = $$('.step'), prog = $$('#steps button'), err = $('#err'), next = $('#next'), back = $('#back');
  const nomesPag = { creditcard: 'Cartão de crédito', pix: 'Pix', boleto: 'Boleto' };
  const meta = [
    { t: 'Quanto você quer doar?', c: 'Passo 1 de 4: escolha mensal ou única e defina o valor.', e: 'Informe um valor de pelo menos R$ 20.' },
    { t: 'Escolha sua missão', c: 'Passo 2 de 4: toque na missão que você quer apoiar.', e: 'Escolha uma missão para continuar.' },
    { t: 'Conte um pouco sobre você', c: 'Passo 3 de 4: preencha seus dados pessoais.', e: 'Preencha os campos destacados.' },
    { t: 'Como prefere pagar?', c: 'Último passo: escolha a forma de pagamento e confirme.', e: 'Preencha os campos destacados e aceite os termos.' }
  ];
  let cur = 0, max = 0, pagamento = 'creditcard', mostrado = 0;

  /* ===== Integração de pagamento =====
     Substitua esta função pela chamada ao seu gateway/back-end.
     Recebe os dados do formulário e deve resolver quando a doação for aceita. */
  function enviarDoacao(dados) {
    console.info('Doação (modo demonstração):', dados);
    return Promise.resolve();
  }

  /* ===== Brilho que acompanha o cursor ===== */
  addEventListener('pointermove', e => {
    document.documentElement.style.setProperty('--mx', e.clientX + 'px');
    document.documentElement.style.setProperty('--my', e.clientY + 'px');
  });

  /* ===== Validade do cartão ===== */
  const mes = $('#c-mes'), ano = $('#c-ano');
  mes.innerHTML = '<option value=""></option>' + Array.from({ length: 12 }, (_, i) => `<option>${String(i + 1).padStart(2, '0')}</option>`).join('');
  const y = new Date().getFullYear();
  ano.innerHTML = '<option value=""></option>' + Array.from({ length: 16 }, (_, i) => `<option>${y + i}</option>`).join('');

  /* ===== Máscaras ===== */
  const digits = v => v.replace(/\D/g, '');
  const maskDoc = v => {
    v = digits(v).slice(0, 14);
    return v.length <= 11
      ? v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      : v.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  };
  const maskCel = v => digits(v).slice(0, 11).replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  const maskCard = v => digits(v).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
  const masks = { '#doc': maskDoc, '#c-doc': maskDoc, '#cel': maskCel, '#c-num': maskCard, '#c-cvv': v => digits(v).slice(0, 4) };
  Object.entries(masks).forEach(([sel, fn]) => $(sel).addEventListener('input', e => { e.target.value = fn(e.target.value); }));

  /* ===== Textos que trocam com animação ===== */
  const swap = (el, txt) => { el.classList.remove('swap'); void el.offsetWidth; el.textContent = txt; el.classList.add('swap'); };

  /* ===== Valor, recorrência e resumo ===== */
  const valorAtual = () => Number(valor.value) || 0;
  const fmt = n => 'R$ ' + n.toLocaleString('pt-BR');
  const sufixo = () => (mensal.checked ? 'por mês' : 'única');

  function contar(de, para) {
    const t0 = performance.now(), dur = 350;
    const tick = t => {
      const p = Math.min((t - t0) / dur, 1);
      mostrado = Math.round(de + (para - de) * (1 - Math.pow(1 - p, 3)));
      $('#resumo').textContent = `${fmt(mostrado)} ${sufixo()}`;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function atualiza() {
    const v = valorAtual();
    $$('.chips button').forEach(b => b.classList.toggle('on', Number(b.dataset.v) === v));
    $$('.switch button').forEach(b => b.classList.toggle('on', Boolean(Number(b.dataset.r)) === mensal.checked));
    const ruim = v > 0 && v < 20;
    $('#hint').classList.toggle('bad', ruim);
    $('#hint').textContent = ruim ? 'O valor mínimo é R$ 20.' : 'Doe outro valor digitando acima. Mínimo de R$ 20.';
    const dia = $('#dia-box');
    dia.hidden = !mensal.checked;
    $$('input', dia).forEach(i => (i.disabled = !mensal.checked));
    contar(mostrado, v);
  }
  $$('.chips button').forEach(b => b.addEventListener('click', () => { valor.value = b.dataset.v; atualiza(); }));
  $$('.switch button').forEach(b => b.addEventListener('click', () => { mensal.checked = b.dataset.r === '1'; atualiza(); }));
  valor.addEventListener('input', atualiza);
  mensal.addEventListener('change', atualiza);

  /* ===== Explicação Única/Mensal: no toque (no mouse é só CSS :hover) ===== */
  $$('.switch button').forEach(b => b.addEventListener('click', () => {
    b.classList.add('tip');
    setTimeout(() => b.classList.remove('tip'), 2800);
  }));

  /* ===== Tela inicial ===== */
  $('#start').addEventListener('click', () => {
    $('#intro').classList.add('leaving');
    setTimeout(() => {
      $('#intro').hidden = true;
      $('#app').hidden = false;
      scrollTo(0, 0);
    }, 450);
  });

  /* ===== Abas de pagamento ===== */
  function mostraPagamento(tipo) {
    pagamento = tipo;
    const abas = $$('#seg button');
    abas.forEach(b => b.setAttribute('aria-selected', b.dataset.pay === tipo));
    $('#seg').style.setProperty('--i', abas.findIndex(b => b.dataset.pay === tipo));
    $$('.pay').forEach(p => {
      const ativo = p.dataset.panel === tipo;
      p.hidden = !ativo;
      $$('input, select', p).forEach(el => (el.disabled = !ativo));
    });
  }
  $$('#seg button').forEach(b => b.addEventListener('click', () => mostraPagamento(b.dataset.pay)));

  /* ===== Navegação entre passos ===== */
  function ir(i) {
    const voltando = i < cur;
    cur = i; max = Math.max(max, i);
    steps.forEach((s, k) => { s.classList.toggle('show', k === i); s.classList.toggle('rev', voltando); });
    prog.forEach((b, k) => {
      b.classList.toggle('on', k === i);
      b.classList.toggle('ok', k < i);
      b.disabled = k > max;
      b.setAttribute('aria-current', k === i ? 'step' : 'false');
    });
    swap($('#titulo'), meta[i].t);
    swap($('#coach-txt'), meta[i].c);
    next.textContent = i === 3 ? 'Doar' : 'Continuar';
    back.hidden = i === 0;
    err.textContent = '';
    form.classList.remove('was-validated');
    scrollTo({ top: 0, behavior: 'smooth' });
  }
  prog.forEach(b => b.addEventListener('click', () => ir(Number(b.dataset.go))));
  back.addEventListener('click', () => ir(cur - 1));

  function validaPasso() {
    const ruim = $$('input, select', steps[cur]).find(el => !el.disabled && !el.checkValidity());
    if (!ruim) { err.textContent = ''; return true; }
    form.classList.add('was-validated');
    err.textContent = meta[cur].e;
    ruim.focus();
    form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
    return false;
  }

  /* ===== Envio ===== */
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validaPasso()) return;
    if (cur < 3) return ir(cur + 1);
    const dados = Object.fromEntries(new FormData(form));
    dados.valor = valorAtual();
    dados.recorrencia = mensal.checked ? 'Mensal' : 'Única';
    dados.pagamento = pagamento;
    dados.dia_cobranca = mensal.checked ? Number(dados.dia_cobranca) : null;
    next.disabled = true;
    enviarDoacao(dados).then(() => {
      $('#d-valor').textContent = `${fmt(dados.valor)} ${sufixo()}${mensal.checked ? ` (dia ${dados.dia_cobranca})` : ''}`;
      $('#d-tipo').textContent = nomesPag[pagamento];
      form.hidden = true;
      $('#steps').hidden = true;
      $('#coach').hidden = true;
      swap($('#titulo'), 'Muito obrigado!');
      done.hidden = false;
      done.focus();
      scrollTo({ top: 0, behavior: 'smooth' });
    }).finally(() => (next.disabled = false));
  });

  $('#nova').addEventListener('click', () => {
    form.reset();
    cur = 0; max = 0;
    mostraPagamento('creditcard');
    atualiza();
    done.hidden = true;
    form.hidden = false;
    $('#steps').hidden = false;
    $('#coach').hidden = false;
    ir(0);
  });

  mostraPagamento('creditcard');
  atualiza();
  ir(0);
})();