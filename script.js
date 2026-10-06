'use strict';

const STORAGE_KEY = 'miniCrmLeads';
const DEAL_STAGES = [
  'Новый лид',
  'Квалифицирован',
  'Назначена консультация',
  'Отказ'
];

const elements = {
  form: document.querySelector('#leadForm'),
  clientName: document.querySelector('#clientName'),
  phone: document.querySelector('#phone'),
  source: document.querySelector('#source'),
  responsible: document.querySelector('#responsible'),
  stage: document.querySelector('#stage'),
  technicalTaskRequested: document.querySelector('#technicalTaskRequested'),
  clientNameError: document.querySelector('#clientNameError'),
  phoneError: document.querySelector('#phoneError'),
  formMessage: document.querySelector('#formMessage'),
  leadsList: document.querySelector('#leadsList'),
  emptyState: document.querySelector('#emptyState'),
  leadCounter: document.querySelector('#leadCounter')
};

let leads = [];

const getFormData = () => ({
  clientName: elements.clientName.value.trim(),
  phone: elements.phone.value.trim(),
  source: elements.source.value,
  responsible: elements.responsible.value,
  stage: elements.stage.value,
  technicalTaskRequested: elements.technicalTaskRequested.checked
});

const clearValidationErrors = () => {
  [elements.clientName, elements.phone].forEach((input) => {
    input.classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
  });

  elements.clientNameError.textContent = '';
  elements.phoneError.textContent = '';
};

const showFieldError = (input, errorElement, message) => {
  input.classList.add('is-invalid');
  input.setAttribute('aria-invalid', 'true');
  errorElement.textContent = message;
};

const validateLeadData = ({ clientName, phone }) => {
  clearValidationErrors();
  const errors = [];

  if (!clientName) {
    showFieldError(
      elements.clientName,
      elements.clientNameError,
      'Введите имя клиента.'
    );
    errors.push(elements.clientName);
  }

  if (!phone) {
    showFieldError(
      elements.phone,
      elements.phoneError,
      'Введите номер телефона.'
    );
    errors.push(elements.phone);
  }

  if (errors.length > 0) {
    errors[0].focus();
  }

  return errors.length === 0;
};

const createLeadId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `lead-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createLead = (formData) => ({
  id: createLeadId(),
  ...formData,
  createdAt: new Date().toISOString()
});

const saveLeads = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
};

const loadLeads = () => {
  const savedLeads = localStorage.getItem(STORAGE_KEY);

  if (!savedLeads) {
    return [];
  }

  try {
    const parsedLeads = JSON.parse(savedLeads);
    return Array.isArray(parsedLeads) ? parsedLeads : [];
  } catch (error) {
    console.error('Не удалось прочитать лиды из localStorage:', error);
    return [];
  }
};

const formatDate = (isoDate) => {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return 'Дата не указана';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const createDetailElement = (label, value) => {
  const wrapper = document.createElement('div');
  const term = document.createElement('dt');
  const description = document.createElement('dd');

  term.textContent = label;
  description.textContent = value;
  wrapper.append(term, description);

  return wrapper;
};

const getNextStage = (currentStage) => {
  const currentIndex = DEAL_STAGES.indexOf(currentStage);

  if (currentIndex === -1 || currentIndex === DEAL_STAGES.length - 1) {
    return null;
  }

  return DEAL_STAGES[currentIndex + 1];
};

const updateLeadStage = (leadId) => {
  const lead = leads.find(({ id }) => id === leadId);

  if (!lead) {
    return;
  }

  const nextStage = getNextStage(lead.stage);

  if (!nextStage) {
    return;
  }

  lead.stage = nextStage;
  saveLeads();
  renderLeads();
};

const createLeadCard = (lead) => {
  const card = document.createElement('article');
  const header = document.createElement('div');
  const title = document.createElement('h3');
  const stageBadge = document.createElement('span');
  const details = document.createElement('dl');
  const footer = document.createElement('div');
  const createdAt = document.createElement('p');
  const nextStageButton = document.createElement('button');
  const nextStage = getNextStage(lead.stage);

  card.className = 'lead-card';
  card.dataset.leadId = lead.id;

  header.className = 'lead-card__header';
  title.textContent = lead.clientName;
  stageBadge.className = 'stage-badge';
  stageBadge.textContent = lead.stage;
  header.append(title, stageBadge);

  details.className = 'lead-card__details';
  details.append(
    createDetailElement('Телефон', lead.phone),
    createDetailElement('Источник', lead.source),
    createDetailElement('Ответственный', lead.responsible),
    createDetailElement('Этап сделки', lead.stage),
    createDetailElement(
      'Запрошено ТЗ',
      lead.technicalTaskRequested ? 'Да' : 'Нет'
    )
  );

  footer.className = 'lead-card__footer';
  createdAt.className = 'created-at';
  createdAt.textContent = `Создан: ${formatDate(lead.createdAt)}`;

  nextStageButton.className = 'secondary-button';
  nextStageButton.type = 'button';
  nextStageButton.textContent = nextStage ? 'Следующий этап' : 'Финальный этап';
  nextStageButton.disabled = !nextStage;
  nextStageButton.setAttribute(
    'aria-label',
    nextStage
      ? `Перевести лид «${lead.clientName}» на следующий этап`
      : `Лид «${lead.clientName}» находится на финальном этапе`
  );
  nextStageButton.addEventListener('click', () => updateLeadStage(lead.id));

  footer.append(createdAt, nextStageButton);
  card.append(header, details, footer);

  return card;
};

const updateInterfaceState = () => {
  const leadsCount = leads.length;
  elements.leadCounter.textContent = `Лидов: ${leadsCount}`;
  elements.emptyState.hidden = leadsCount > 0;
};

const renderLeads = () => {
  elements.leadsList.replaceChildren();

  leads
    .slice()
    .reverse()
    .map(createLeadCard)
    .forEach((card) => elements.leadsList.append(card));

  updateInterfaceState();
};

const showFormMessage = (message, type) => {
  elements.formMessage.textContent = message;
  elements.formMessage.className = `form-message ${type ? `is-${type}` : ''}`;
};

const resetForm = () => {
  elements.form.reset();
  elements.stage.value = DEAL_STAGES[0];
  clearValidationErrors();
  elements.clientName.focus();
};

const handleFormSubmit = (event) => {
  event.preventDefault();

  const formData = getFormData();

  if (!validateLeadData(formData)) {
    showFormMessage('Проверьте обязательные поля.', 'error');
    return;
  }

  const newLead = createLead(formData);
  leads.push(newLead);
  saveLeads();
  renderLeads();
  resetForm();
  showFormMessage(`Лид «${newLead.clientName}» сохранён.`, 'success');
};

const initializeApp = () => {
  leads = loadLeads();
  renderLeads();
  elements.form.addEventListener('submit', handleFormSubmit);
};

initializeApp();
