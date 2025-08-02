// Firebase config (replace with your own credentials)
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM Elements
const clientTableBody = document.getElementById('clientTableBody');
const clientForm = document.getElementById('clientForm');
const clientModal = document.getElementById('clientModal');
const clientDetailsModal = document.getElementById('clientDetailsModal');
const modalTitle = document.getElementById('modalTitle');
const emailModal = document.getElementById('emailModal');
const hamdiTaskList = document.getElementById('hamdiTaskList');
const dinaTaskList = document.getElementById('dinaTaskList');
const searchInput = document.getElementById('searchClients');
const messageBox = document.getElementById('messageBox');
const themeSwitcher = document.getElementById('themeSwitcher');
const themeIcon = document.getElementById('themeIcon');

// Modal close buttons
document.getElementById('closeClientModal').onclick = closeClientModal;
document.getElementById('closeClientDetailsModal').onclick = closeClientDetailsModal;
document.getElementById('closeEmailModal').onclick = closeEmailModal;
window.onclick = function(event) {
  [clientModal, clientDetailsModal, emailModal].forEach(modal => {
    if (event.target === modal) modal.style.display = "none";
  });
};

// State
let clients = [];
let editingClient = null;
let currentEmailClient = null;
let currentDetailsClient = null;

// Real-time Listener
db.collection('clients').onSnapshot(snapshot => {
  showMessage("Data loaded in real-time.", "info", 1500);
  clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderAll();
}, err => {
  showMessage(`Error loading data: ${err.message}`, "error", 5000);
});

// Render Functions
function renderClients(filter = '') {
  let filtered = clients;
  if (filter) {
    const f = filter.toLowerCase();
    filtered = clients.filter(c =>
      (c.CompanyName || '').toLowerCase().includes(f) ||
      (c.ContactPerson || '').toLowerCase().includes(f) ||
      (c.Email || '').toLowerCase().includes(f) ||
      (c.Salesperson || '').toLowerCase().includes(f)
    );
  }
  clientTableBody.innerHTML = filtered.map(client => `
    <tr>
      <td>${client.CompanyName}</td>
      <td>${client.ContactPerson}</td>
      <td>${client.Salesperson || ''}</td>
      <td>${client.NextAction || ''}</td>
      <td>${client.NextFollowUp || ''}</td>
      <td>${client.CurrentStage || ''}</td>
      <td class="client-actions">
        <button class="action-btn" title="Details" onclick="openClientDetailsModal('${client.id}')"><i data-lucide="info"></i></button>
        <button class="action-btn" title="Edit" onclick="openClientModal('edit','${client.id}')"><i data-lucide="edit"></i></button>
        <button class="action-btn" title="Delete" onclick="deleteClient('${client.id}')"><i data-lucide="trash"></i></button>
        <button class="action-btn" title="Email" onclick="openEmailModal('${client.id}')"><i data-lucide="mail"></i></button>
      </td>
    </tr>
  `).join('');
  lucide.createIcons();
}
function renderStats() {
  let dueToday = 0, meetings = 0, calls = 0, active = 0, won = 0, quotations = 0;
  let quotationsSum = 0;
  const today = new Date().toISOString().slice(0, 10);
  clients.forEach(c => {
    if ((c.NextFollowUp || '').slice(0, 10) === today) dueToday++;
    if ((c.CurrentStage || '').toLowerCase().includes('meeting')) meetings++;
    if ((c.NextAction || '').toLowerCase().includes('call')) calls++;
    if ((c.CurrentStage || '').toLowerCase().includes('won')) won++;
    if ((c.CurrentStage || '').toLowerCase().includes('active')) active++;
    if (c.QuoteAmount) {
      quotations++;
      quotationsSum += parseFloat(c.QuoteAmount) || 0;
    }
  });
  document.getElementById('statDueToday').textContent = dueToday;
  document.getElementById('statMeetingsThisWeek').textContent = meetings;
  document.getElementById('statPendingCalls').textContent = calls;
  document.getElementById('statActiveClients').textContent = active;
  document.getElementById('statWonThisMonth').textContent = won;
  document.getElementById('statTotalQuotations').textContent = `${quotations} ($${quotationsSum.toFixed(2)})`;
}
function renderTasks() {
  const renderTaskList = (salesperson) => {
    return clients.filter(c => (c.Salesperson || '').toLowerCase() === salesperson)
      .map(c => `<div class="task-item">
        <div class="task-info">
          <div class="task-title">${c.CompanyName}</div>
          <div class="task-meta">${c.NextAction || ''} | Next: ${c.NextFollowUp || ''}</div>
        </div>
      </div>`).join('');
  };
  hamdiTaskList.innerHTML = renderTaskList('hamdi');
  dinaTaskList.innerHTML = renderTaskList('dina');
}
function renderAll() {
  renderClients(searchInput.value);
  renderStats();
  renderTasks();
}

// CRUD Functions
clientForm.onsubmit = async (e) => {
  e.preventDefault();
  const clientData = {
    CompanyName: document.getElementById('companyName').value,
    ContactPerson: document.getElementById('contactPerson').value,
    Email: document.getElementById('email').value,
    Phone: document.getElementById('phone').value,
    Salesperson: document.getElementById('Salesperson').value,
    CurrentStage: document.getElementById('currentStage').value,
    NextAction: document.getElementById('nextAction').value,
    NextFollowUp: document.getElementById('nextFollowUp').value,
    QuoteAmount: document.getElementById('QuoteAmount').value,
    Comments: editingClient ? editingClient.Comments : ''
  };
  try {
    if (editingClient) {
      await db.collection('clients').doc(editingClient.id).update(clientData);
      showMessage('Client updated!', 'success');
    } else {
      await db.collection('clients').add(clientData);
      showMessage('Client added!', 'success');
    }
    closeClientModal();
  } catch (err) {
    showMessage(`Error saving data: ${err.message}`, 'error', 5000);
  }
};
window.deleteClient = async (id) => {
  if (!confirm('Are you sure you want to delete this client?')) return;
  try {
    await db.collection('clients').doc(id).delete();
    showMessage('Client deleted.', 'warning');
  } catch (err) {
    showMessage(`Error deleting data: ${err.message}`, 'error', 5000);
  }
};

// Modal Controls
window.openClientModal = (mode, id = null) => {
  clientModal.style.display = 'flex';
  if (mode === 'edit' && id) {
    editingClient = clients.find(c => c.id === id);
    modalTitle.textContent = 'Edit Client';
    populateClientForm(editingClient);
  } else {
    editingClient = null;
    modalTitle.textContent = 'Add New Client';
    clientForm.reset();
    document.getElementById('clientId').value = '';
  }
};
function closeClientModal() {
  clientModal.style.display = 'none';
  editingClient = null;
}
document.getElementById('addClientBtn').onclick = () => openClientModal('add');
function populateClientForm(client) {
  document.getElementById('clientId').value = client.id || '';
  document.getElementById('companyName').value = client.CompanyName || '';
  document.getElementById('contactPerson').value = client.ContactPerson || '';
  document.getElementById('email').value = client.Email || '';
  document.getElementById('phone').value = client.Phone || '';
  document.getElementById('Salesperson').value = client.Salesperson || '';
  document.getElementById('currentStage').value = client.CurrentStage || '';
  document.getElementById('nextAction').value = client.NextAction || '';
  document.getElementById('nextFollowUp').value = client.NextFollowUp || '';
  document.getElementById('QuoteAmount').value = client.QuoteAmount || '';
}
window.openClientDetailsModal = (id) => {
  currentDetailsClient = clients.find(c => c.id === id);
  document.getElementById('detailsModalTitle').textContent = currentDetailsClient.CompanyName;
  document.getElementById('clientDetailsContent').innerHTML = `
    <div class="client-details">
      <div class="detail-item"><label>Contact:</label><div class="value">${currentDetailsClient.ContactPerson}</div></div>
      <div class="detail-item"><label>Email:</label><div class="value">${currentDetailsClient.Email}</div></div>
      <div class="detail-item"><label>Phone:</label><div class="value">${currentDetailsClient.Phone}</div></div>
      <div class="detail-item"><label>Salesperson:</label><div class="value">${currentDetailsClient.Salesperson}</div></div>
      <div class="detail-item"><label>Stage:</label><div class="value">${currentDetailsClient.CurrentStage}</div></div>
      <div class="detail-item"><label>Next Action:</label><div class="value">${currentDetailsClient.NextAction}</div></div>
      <div class="detail-item"><label>Next Follow-Up:</label><div class="value">${currentDetailsClient.NextFollowUp}</div></div>
      <div class="detail-item"><label>Quotation:</label><div class="value">${currentDetailsClient.QuoteAmount}</div></div>
    </div>`;
  document.getElementById('clientNotes').value = currentDetailsClient.Comments || '';
  clientDetailsModal.style.display = 'flex';
};
function closeClientDetailsModal() {
  clientDetailsModal.style.display = 'none';
  currentDetailsClient = null;
}
document.getElementById('saveNotesBtn').onclick = async () => {
  if (!currentDetailsClient) return;
  const notes = document.getElementById('clientNotes').value;
  try {
    await db.collection('clients').doc(currentDetailsClient.id).update({ Comments: notes });
    showMessage('Notes saved.', 'success');
  } catch(err) {
    showMessage(`Error saving notes: ${err.message}`, 'error');
  }
};
document.getElementById('editFromDetailsBtn').onclick = () => {
  if (!currentDetailsClient) return;
  closeClientDetailsModal();
  openClientModal('edit', currentDetailsClient.id);
};
window.openEmailModal = (id) => {
  currentEmailClient = clients.find(c => c.id === id);
  emailModal.style.display = 'flex';
  document.querySelectorAll('.email-template-btn').forEach(btn => btn.classList.remove('selected'));
};
function closeEmailModal() {
  emailModal.style.display = 'none';
}
document.querySelectorAll('.email-template-btn').forEach(btn => {
  btn.onclick = function() {
    document.querySelectorAll('.email-template-btn').forEach(b => b.classList.remove('selected'));
    this.classList.add('selected');
  };
});
document.getElementById('sendEmailBtn').onclick = () => {
  const selectedBtn = document.querySelector('.email-template-btn.selected');
  if (!currentEmailClient || !selectedBtn) {
    showMessage('Select a client and a template.', 'error');
    return;
  }
  const template = selectedBtn.getAttribute('data-template');
  let subject = '', body = '';
  if (template === 'initial') {
    subject = `Initial Contact with ${currentEmailClient.CompanyName}`;
    body = `Hi ${currentEmailClient.ContactPerson},\n\nI'm reaching out regarding...`;
  } else if (template === 'followUp') {
    subject = `Follow-Up: ${currentEmailClient.CompanyName}`;
    body = `Hi ${currentEmailClient.ContactPerson},\n\nJust following up...`;
  } else if (template === 'proposal') {
    subject = `Proposal for ${currentEmailClient.CompanyName}`;
    body = `Dear ${currentEmailClient.ContactPerson},\n\nPlease find attached our proposal...`;
  }
  window.open(`mailto:${currentEmailClient.Email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  closeEmailModal();
};
searchInput.oninput = function() {
  renderClients(this.value);
};

// UI and Utility Functions
function showMessage(text, type = 'success', timeout = 2500) {
  messageBox.textContent = text;
  messageBox.className = 'message-box visible ' + type;
  setTimeout(() => {
    messageBox.classList.remove('visible');
  }, timeout);
}

// Theme
function toggleTheme() {
  const body = document.body;
  const currentTheme = body.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  body.setAttribute('data-theme', newTheme);
  localStorage.setItem('clientTheme', newTheme);
  themeIcon.setAttribute('data-lucide', newTheme === 'dark' ? 'sun' : 'moon');
  lucide.createIcons();
}
function loadTheme() {
  const theme = localStorage.getItem('clientTheme') || 'dark';
  document.body.setAttribute('data-theme', theme);
  themeIcon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
  lucide.createIcons();
}
themeSwitcher.onclick = toggleTheme;

// Initial Load
function init() {
  loadTheme();
  renderAll();
  lucide.createIcons();
}
window.onload = init;
