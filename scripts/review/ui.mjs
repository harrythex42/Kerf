const $ = id => document.getElementById(id);
const login = $('login');
const input = $('reviewer');
const review = $('review');
const session = document.querySelector('.session');
const preview = $('preview');
const voteButtons = [...document.querySelectorAll('[data-vote]')];
let current;
let reviewer = '';
let busy = false;

function showError(message = '') {
  const status = $('status');
  status.textContent = message;
  status.hidden = !message;
}

async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '本地评审台暂时无法响应。');
  return data;
}

function renderPages(side, data) {
  $(side).replaceChildren(...data.images.map((path, index) => {
    const outer = document.createElement('figure');
    outer.className = 'sheet';
    const button = document.createElement('button');
    button.type = 'button';
    const label = '第 ' + (index + 1) + ' 页';
    button.setAttribute('aria-label', (side === 'left' ? '左边' : '右边') + label + '，点击放大');
    const img = new Image();
    img.src = path;
    img.alt = label;
    img.loading = index <= 1 ? 'eager' : 'lazy';
    button.append(img);
    button.addEventListener('click', () => {
      $('preview-page').src = path;
      $('preview-page').alt = label;
      preview.showModal();
    });
    const caption = document.createElement('figcaption');
    caption.textContent = label;
    outer.append(button, caption);
    return outer;
  }));
}

function render(data) {
  current = data.pair;
  login.hidden = true;
  session.hidden = false;
  review.hidden = !current;
  $('complete').hidden = Boolean(current);
  $('progress').textContent = '已评 ' + data.completed + ' 组 · ' + reviewer;
  if (current) {
    renderPages('left', current.left);
    renderPages('right', current.right);
  }
  showError();
  window.scrollTo(0, 0);
}

async function submit(choice) {
  if (!current || busy || preview.open) return;
  busy = true;
  voteButtons.forEach(button => { button.disabled = true; });
  try {
    const data = await request('/api/vote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer, pairId: current.id, choice })
    });
    render(data);
  } catch (error) {
    showError(error.message || '保存失败，请再试一次。');
  } finally {
    busy = false;
    voteButtons.forEach(button => { button.disabled = false; });
  }
}

input.value = localStorage.getItem('unsliced-reviewer') || '';
login.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  busy = true;
  try {
    const name = input.value.trim();
    const data = await request('/api/next?' + new URLSearchParams({ reviewer: name }));
    reviewer = name;
    localStorage.setItem('unsliced-reviewer', name);
    render(data);
  } catch (error) {
    showError(error.message);
  } finally {
    busy = false;
  }
});
$('change').addEventListener('click', () => {
  if (busy) return;
  current = undefined;
  session.hidden = review.hidden = $('complete').hidden = true;
  login.hidden = false;
  input.focus();
  input.select();
});
$('close-preview').addEventListener('click', () => preview.close());
voteButtons.forEach(button => button.addEventListener('click', () => submit(button.dataset.vote)));
window.addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.target === input) return;
  const choice = { '1': 'left', '2': 'tie', '3': 'right' }[event.key];
  if (choice) submit(choice);
});
