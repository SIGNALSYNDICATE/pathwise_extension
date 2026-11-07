// Supabase initialization
const SUPABASE_URL = 'https://aofvzgqksbhgljzowyby.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvZnZ6Z3Frc2JoZ2xqem93eWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MzAxMTEsImV4cCI6MjA3MDAwNjExMX0.XA4xgMqrMy9finlY9xvOhPdrQIsKYlRGmrNx_1D6db4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const authContainer = document.getElementById('authContainer');
const loginPage = document.getElementById('loginPage');
const signupPage = document.getElementById('signupPage');
const consentPage = document.getElementById('consentPage');
const rolesPage = document.getElementById('rolesPage');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignUp = document.getElementById('showSignUp');
const showLogin = document.getElementById('showLogin');
const appContent = document.getElementById('appContent');
const logoutBtn = document.getElementById('logoutBtn');

// Tabs and Sections
const jobTab = document.getElementById('jobTab');
const followUpTab = document.getElementById('followUpTab');
const analyticsTab = document.getElementById('analyticsTab');
const jobSection = document.getElementById('jobSection');
const followUpSection = document.getElementById('followUpSection');
const analyticsSection = document.getElementById('analyticsSection');

// Profile elements
const userInitials = document.getElementById('userInitials');
const userEmail = document.getElementById('userEmail');

// Stats elements
const totalApplications = document.getElementById('totalApplications');
const interviewCount = document.getElementById('interviewCount');
const offerCount = document.getElementById('offerCount');

// Analytics elements
const avgExpectation = document.getElementById('avgExpectation');
const successRate = document.getElementById('successRate');

// Storage keys
const OFFLINE_QUEUE_KEY = 'offline_job_queue';
const LOCAL_JOBS_KEY = 'local_jobs';
const SESSION_KEY = 'supabase_session';
const ONBOARDING_KEY = 'onboarding_state';

// Global variables
let currentJobs = [];
let selectedRoles = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  setupAuthEventListeners();
  setupJobEventListeners();
  setupTabNavigation();
  setupFileUpload();
  setupSlider();
  setupFilter();
  setupOnboarding();
  await checkAuthState();
}

function setupTabNavigation() {
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });
  jobSection.classList.add('active');

  jobTab.addEventListener('click', () => switchTab('jobTab'));
  followUpTab.addEventListener('click', () => switchTab('followUpTab'));
  analyticsTab.addEventListener('click', () => switchTab('analyticsTab'));
}

function switchTab(activeTabId) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active-tab'));
  document.getElementById(activeTabId).classList.add('active-tab');

  document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));

  switch (activeTabId) {
    case 'jobTab':
      jobSection.classList.add('active');
      break;
    case 'followUpTab':
      followUpSection.classList.add('active');
      break;
    case 'analyticsTab':
      analyticsSection.classList.add('active');
      renderAnalytics();
      break;
  }
}

function setupSlider() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;

  const slider = document.getElementById('expectationSlider');
  const valueDisplay = document.getElementById('expectationValue');

  slider.addEventListener('input', () => {
    valueDisplay.textContent = slider.value;
  });
}

function setupFilter() {
  const filterSelect = document.getElementById('filterSelect');
  filterSelect.addEventListener('change', () => {
    renderApplicationsList();
  });
}

function setupFileUpload() {
  const dropArea = document.getElementById('fileDropArea');
  const fileInput = document.getElementById('resumeUpload');
  const fileNameDisplay = document.getElementById('fileNameDisplay');

  dropArea.addEventListener('click', () => {
    fileInput.click();
  });

  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('dragover');
  });

  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('dragover');
  });

  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover');

    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      showFileName(fileInput.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      showFileName(fileInput.files[0]);
    }
  });
}

function showFileName(file) {
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  fileNameDisplay.textContent = `📄 ${file.name}`;
  fileNameDisplay.style.display = 'block';
}

function clearFile() {
  const fileInput = document.getElementById('resumeUpload');
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  fileInput.value = "";
  fileNameDisplay.textContent = "";
  fileNameDisplay.style.display = 'none';
}

function updateProfileSection(email) {
  if (email) {
    userEmail.textContent = email;
    userInitials.textContent = getInitials(email);
    userInitials.title = email;
  } else {
    userEmail.textContent = 'Not signed in';
    userInitials.textContent = '?';
    userInitials.title = '';
  }
}

function getInitials(email) {
  if (!email) return '?';
  const parts = email.split('@')[0].split(/[. _-]/);
  return parts.map(part => part.charAt(0)).join('').toUpperCase().substring(0, 2);
}

// ================= AUTHENTICATION FUNCTIONS =================
async function checkAuthState() {
  const session = await getSession();
  if (session) {
    const onboardingDone = await isOnboardingComplete(session.user.id);
    if (!onboardingDone) {
      beginOnboarding(session.user.id);
      return;
    }
    showAppContent();
    updateProfileSection(session.user.email);
    await renderAll();
  } else {
    showAuthPage('login');
    updateProfileSection(null);
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      storeSession(session);
      const onboardingDone = await isOnboardingComplete(session.user.id);
      if (!onboardingDone) {
        beginOnboarding(session.user.id);
      } else {
        showAppContent();
        updateProfileSection(session.user.email);
        renderAll();
      }
    } else if (event === 'SIGNED_OUT') {
      clearSession();
      updateProfileSection(null);
      showAuthPage('login');
    }
  });
}

function setupAuthEventListeners() {
  showSignUp.addEventListener('click', (e) => {
    e.preventDefault();
    showAuthPage('signup');
  });

  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    showAuthPage('login');
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert('Login failed: ' + error.message);
    } else {
      storeSession(data.session);
      updateProfileSection(data.user.email);
      const onboardingDone = await isOnboardingComplete(data.user.id);
      if (!onboardingDone) {
        beginOnboarding(data.user.id);
      } else {
        showAppContent();
        await renderAll();
      }
    }
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;

    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    if (!agreeTerms) {
      alert('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      alert('Signup failed: ' + error.message);
    } else {
      storeSession(data.session);
      updateProfileSection(data.user.email);
      beginOnboarding(data.user.id);
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    clearSession();
    showAuthPage('login');
  });

  document.getElementById('openAppBtn').addEventListener('click', () => {
    window.open('https://job-dash-ashy.vercel.app/', '_blank');
  });

  setupPasswordToggles();
}

function setupPasswordToggles() {
  const togglePassword = (toggleId, inputId) => {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);

    if (toggle && input) {
      toggle.addEventListener('click', () => {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);

        const icon = toggle.querySelector('svg');
        if (type === 'text') {
          icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
        } else {
          icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
        }
      });
    }
  };

  togglePassword('loginPasswordToggle', 'loginPassword');
  togglePassword('signupPasswordToggle', 'signupPassword');
  togglePassword('confirmPasswordToggle', 'confirmPassword');
}

function showAuthPage(page) {
  loginPage.style.display = page === 'login' ? 'flex' : 'none';
  signupPage.style.display = page === 'signup' ? 'flex' : 'none';
  consentPage.style.display = page === 'consent' ? 'flex' : 'none';
  rolesPage.style.display = page === 'roles' ? 'flex' : 'none';
  authContainer.style.display = 'flex';
  appContent.style.display = 'none';
}

function showAppContent() {
  authContainer.style.display = 'none';
  appContent.style.display = 'flex';
}

async function getSession() {
  const sessionData = localStorage.getItem(SESSION_KEY);
  return sessionData ? JSON.parse(sessionData) : null;
}

function storeSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LOCAL_JOBS_KEY);
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

// ================= ONBOARDING FUNCTIONS =================
function setupOnboarding() {
  const agree = document.getElementById('agreeCommunity');
  const continueBtn = document.getElementById('consentContinueBtn');

  if (agree && continueBtn) {
    agree.addEventListener('change', () => {
      continueBtn.disabled = !agree.checked;
    });
  }

  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      showAuthPage('roles');
    });
  }

  const skipBtn = document.getElementById('consentSkipBtn');
  if (skipBtn) {
    skipBtn.addEventListener('click', async () => {
      await saveCommunityConsent(false);
      showAuthPage('roles');
    });
  }

  const roleInput = document.getElementById('roleInput');
  const addRoleBtn = document.getElementById('addRoleBtn');
  const rolesFinishBtn = document.getElementById('rolesFinishBtn');

  if (addRoleBtn) addRoleBtn.addEventListener('click', addRoleChip);
  if (roleInput) {
    roleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addRoleChip(); }
    });
  }

  if (rolesFinishBtn) {
    rolesFinishBtn.addEventListener('click', async () => {
      const session = await getSession();
      if (!session) return;
      await saveRoles(selectedRoles);
      await markOnboardingComplete(session.user.id);
      showAppContent();
      updateProfileSection(session.user.email);
      await renderAll();
    });
  }
}

function beginOnboarding(userId) {
  const agree = document.getElementById('agreeCommunity');
  const continueBtn = document.getElementById('consentContinueBtn');
  if (agree) agree.checked = false;
  if (continueBtn) continueBtn.disabled = true;

  selectedRoles = [];
  renderRoleChips();

  authContainer.style.display = 'flex';
  appContent.style.display = 'none';
  showAuthPage('consent');
}

function addRoleChip() {
  const input = document.getElementById('roleInput');
  const value = input.value.trim();
  if (!value) return;
  if (selectedRoles.includes(value)) { input.value = ''; return; }
  selectedRoles.push(value);
  input.value = '';
  renderRoleChips();
}

function renderRoleChips() {
  const container = document.getElementById('roleChips');
  if (!container) return;
  if (selectedRoles.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = selectedRoles.map((role, i) => `
    <span class="role-chip">
      ${role}
      <button type="button" class="chip-remove" data-index="${i}">×</button>
    </span>
  `).join('');
  container.querySelectorAll('.chip-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRoles.splice(parseInt(btn.dataset.index), 1);
      renderRoleChips();
    });
  });
}

async function saveCommunityConsent(accepted) {
  const session = await getSession();
  if (!session) return;
  const userId = session.user.id;

  try {
    await chrome.storage.local.set({
      [`community_consent_${userId}`]: {
        accepted,
        timestamp: new Date().toISOString()
      }
    });
  } catch (e) {
    console.warn('Could not save consent locally:', e);
  }

  if (isOnline()) {
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        community_consent: accepted,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Could not sync consent to Supabase:', e);
    }
  }
}

async function saveRoles(roles) {
  const session = await getSession();
  if (!session) return;
  const userId = session.user.id;
  
  const rolesString = roles.length > 0 ? roles.join(', ') : null;

  try {
    await chrome.storage.local.set({
      [`user_roles_${userId}`]: roles
    });
  } catch (e) {
    console.warn('Could not save roles locally:', e);
  }

  if (isOnline()) {
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        target_role: rolesString,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Could not sync roles to Supabase:', e);
    }
  }
}

async function isOnboardingComplete(userId) {
  try {
    const result = await chrome.storage.local.get(ONBOARDING_KEY);
    const state = result[ONBOARDING_KEY] || {};
    return state[userId] === true;
  } catch (e) {
    console.warn('Could not read onboarding state:', e);
    return false;
  }
}

async function markOnboardingComplete(userId) {
  try {
    const result = await chrome.storage.local.get(ONBOARDING_KEY);
    const state = result[ONBOARDING_KEY] || {};
    state[userId] = true;
    await chrome.storage.local.set({ [ONBOARDING_KEY]: state });
  } catch (e) {
    console.warn('Could not save onboarding state:', e);
  }
}

// ================= JOB TRACKING FUNCTIONS =================
function setupJobEventListeners() {
  document.getElementById('jobForm').addEventListener('submit', handleJobFormSubmit);
}

async function handleJobFormSubmit(e) {
  e.preventDefault();

  const session = await getSession();
  if (!session) {
    showAuthPage('login');
    return;
  }

  let userRoles = '';
  try {
    const localRoles = await chrome.storage.local.get(`user_roles_${session.user.id}`);
    const rolesArray = localRoles[`user_roles_${session.user.id}`] || [];
    userRoles = rolesArray.join(', ');
  } catch (e) {
    console.warn('Could not retrieve roles', e);
  }

  const formData = {
    company: document.getElementById('company').value,
    role: document.getElementById('role').value,
    date_applied: document.getElementById('date').value || new Date().toISOString().split('T')[0],
    feedback: document.getElementById('feedback')?.checked || false,
    interviewed: document.getElementById('interviewed').checked,
    offered: document.getElementById('offer').checked,
    got_job: document.getElementById('gotJob').checked,
    mood: document.getElementById('mood').value,
    application_expectation: parseInt(document.getElementById('expectationSlider').value),
    resume_filename: '',
    resume_data: '',
    user_id: session.user.id,
    community_role: userRoles
  };

  const resumeFile = document.getElementById('resumeUpload').files[0];
  if (resumeFile) {
    try {
      const resumeData = await extractTextFromPDF(resumeFile);
      formData.resume_filename = resumeData.filename;
      formData.resume_data = resumeData.text;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      alert('Error processing resume PDF. Please try again.');
      return;
    }
  }

  if (isOnline()) {
    try {
      const { error } = await supabase
        .from('job_applications')
        .insert([formData]);

      if (error) throw error;
      alert('Job application added successfully!');
    } catch (error) {
      await handleOfflineSubmission(formData);
    }
  } else {
    await handleOfflineSubmission(formData);
  }

  e.target.reset();
  clearFile();
  document.getElementById('expectationSlider').value = 3;
  document.getElementById('expectationValue').textContent = '3';

  await renderAll();
}

async function extractTextFromPDF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async function(event) {
      try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdfjs/pdf.worker.min.js');

        const typedArray = new Uint8Array(event.target.result);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;

        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(' ') + '\n';
        }

        resolve({
          filename: file.name,
          text: text
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = error => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

async function handleOfflineSubmission(formData) {
  await saveToLocal(formData);
  await addToOfflineQueue('create', formData);
  alert('You are offline. Job application saved locally and will sync when you reconnect.');
}

async function fetchJobs() {
  const session = await getSession();
  if (!session) {
    console.log('No session found, returning empty jobs array');
    return [];
  }

  let remoteJobs = [];
  const localJobs = await getLocalJobs();

  console.log('Fetching jobs for user:', session.user.id);
  console.log('Local jobs count:', localJobs.length);

  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('date_applied', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      remoteJobs = data || [];
      console.log('Remote jobs fetched:', remoteJobs.length);

    } catch (error) {
      console.error('Error fetching remote jobs:', error);
    }
  }

  const userLocalJobs = localJobs.filter(job => job.user_id === session.user.id);
  console.log('User local jobs:', userLocalJobs.length);

  const allJobs = [...remoteJobs, ...userLocalJobs].sort((a, b) =>
    new Date(b.date_applied) - new Date(a.date_applied)
  );

  console.log('Total jobs after merge:', allJobs.length);
  currentJobs = allJobs;
  return allJobs;
}

async function updateJobField(id, field, value) {
  const session = await getSession();
  if (!session) {
    showAuthPage('login');
    return;
  }

  if (id.startsWith('local_')) {
    const localJobs = await getLocalJobs();
    const index = localJobs.findIndex(job => job.local_id === id);
    if (index >= 0) {
      localJobs[index][field] = value;
      await chrome.storage.local.set({ [LOCAL_JOBS_KEY]: localJobs });
    }
  } else if (isOnline()) {
    try {
      const { error } = await supabase
        .from('job_applications')
        .update({ [field]: value })
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (error) throw error;
    } catch (error) {
      await addToOfflineQueue('update', { id, update: { [field]: value } });
    }
  } else {
    await addToOfflineQueue('update', { id, update: { [field]: value } });
  }

  await renderAll();
}

async function renderAll() {
  await fetchJobs();
  updateStats();
  await renderApplicationsList();
  updateSyncStatus();
}

function updateStats() {
  const jobs = currentJobs || [];
  const total = jobs.length;
  const interviews = jobs.filter(job => job.interviewed).length;
  const offers = jobs.filter(job => job.offered).length;

  totalApplications.textContent = total;
  interviewCount.textContent = interviews;
  offerCount.textContent = offers;
}

async function renderApplicationsList() {
  const jobs = currentJobs || [];
  const filterSelect = document.getElementById('filterSelect');
  const filterValue = filterSelect.value;

  let filteredJobs = jobs;

  switch (filterValue) {
    case 'interviewed':
      filteredJobs = jobs.filter(job => job.interviewed);
      break;
    case 'offered':
      filteredJobs = jobs.filter(job => job.offered);
      break;
    case 'hired':
      filteredJobs = jobs.filter(job => job.got_job);
      break;
    case 'pending':
      filteredJobs = jobs.filter(job => !job.interviewed && !job.offered && !job.got_job);
      break;
    case 'all':
    default:
      filteredJobs = jobs;
  }

  const applicationsList = document.getElementById('applicationsList');
  applicationsList.innerHTML = '';

  if (filteredJobs.length === 0) {
    applicationsList.innerHTML = `
      <div class="empty-state">
        <p>No applications found</p>
        <small>Try changing your filter or add new applications</small>
      </div>
    `;
    return;
  }

  filteredJobs.forEach((job) => {
    const appCard = createApplicationCard(job);
    applicationsList.appendChild(appCard);
  });
}

function createApplicationCard(job) {
  const appCard = document.createElement('div');
  appCard.className = 'application-card';

  const progress = calculateProgress(job);
  const statusBadges = generateStatusBadges(job);

  appCard.innerHTML = `
    <div class="app-card-header">
      <div>
        <div class="app-company">${job.company}</div>
        <div class="app-role">${job.role}</div>
      </div>
      <div class="app-date">${formatDate(job.date_applied)}</div>
    </div>

    <div class="follow-up-progress">
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress.percentage}%"></div>
      </div>
      <div class="progress-text">${progress.completed}/3 milestones completed</div>
    </div>

    <div class="follow-up-actions">
      <div class="follow-up-item">
        <input type="checkbox"
               class="follow-up-checkbox"
               id="interviewed_${job.id || job.local_id}"
               ${job.interviewed ? 'checked' : ''}
               data-id="${job.id || job.local_id}"
               data-field="interviewed">
        <label class="follow-up-label" for="interviewed_${job.id || job.local_id}">Interviewed</label>
      </div>

      <div class="follow-up-item">
        <input type="checkbox"
               class="follow-up-checkbox"
               id="offered_${job.id || job.local_id}"
               ${job.offered ? 'checked' : ''}
               data-id="${job.id || job.local_id}"
               data-field="offered">
        <label class="follow-up-label" for="offered_${job.id || job.local_id}">Got Offer</label>
      </div>

      <div class="follow-up-item">
        <input type="checkbox"
               class="follow-up-checkbox"
               id="hired_${job.id || job.local_id}"
               ${job.got_job ? 'checked' : ''}
               data-id="${job.id || job.local_id}"
               data-field="got_job">
        <label class="follow-up-label" for="hired_${job.id || job.local_id}">Hired</label>
      </div>
    </div>

    <div class="app-card-footer">
      <div class="app-status">
        ${statusBadges}
      </div>
      <div class="app-mood">${getMoodEmoji(job.mood)}</div>
    </div>

    <div class="app-actions">
      <button class="action-btn add-note" data-id="${job.id || job.local_id}">
        Add Note
      </button>
      <button class="action-btn view-details" data-id="${job.id || job.local_id}">
        Details
      </button>
    </div>
  `;

  const checkboxes = appCard.querySelectorAll('.follow-up-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const id = this.getAttribute('data-id');
      const field = this.getAttribute('data-field');
      const value = this.checked;

      this.disabled = true;

      updateJobField(id, field, value).then(() => {
        this.disabled = false;
        showUpdateFeedback(this, 'Updated!');
      }).catch(() => {
        this.disabled = false;
        this.checked = !value;
      });
    });
  });

  const addNoteBtn = appCard.querySelector('.add-note');
  const viewDetailsBtn = appCard.querySelector('.view-details');

  addNoteBtn.addEventListener('click', function() {
    const jobId = this.getAttribute('data-id');
    showNoteModal(jobId);
  });

  viewDetailsBtn.addEventListener('click', function() {
    const jobId = this.getAttribute('data-id');
    showJobDetails(jobId);
  });

  return appCard;
}

function calculateProgress(job) {
  const milestones = ['interviewed', 'offered', 'got_job'];
  const completed = milestones.filter(milestone => job[milestone]).length;
  const percentage = (completed / milestones.length) * 100;

  return {
    completed,
    total: milestones.length,
    percentage
  };
}

function generateStatusBadges(job) {
  let badges = '';

  if (job.interviewed) {
    badges += '<span class="status-badge status-interview">Interviewed</span>';
  }

  if (job.offered) {
    badges += '<span class="status-badge status-offer">Offer</span>';
  }

  if (job.got_job) {
    badges += '<span class="status-badge status-hired">Hired</span>';
  }

  if (!job.interviewed && !job.offered && !job.got_job) {
    badges += '<span class="status-badge status-pending">Pending</span>';
  }

  return badges;
}

function showUpdateFeedback(element, message) {
  const originalColor = element.style.accentColor;
  element.style.accentColor = '#22c55e';

  const tooltip = document.createElement('div');
  tooltip.textContent = message;
  tooltip.style.cssText = `
    position: absolute;
    background: #22c55e;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 10px;
    z-index: 1000;
    pointer-events: none;
  `;

  const rect = element.getBoundingClientRect();
  tooltip.style.left = (rect.left + rect.width/2 - 20) + 'px';
  tooltip.style.top = (rect.top - 25) + 'px';

  document.body.appendChild(tooltip);

  setTimeout(() => {
    element.style.accentColor = originalColor;
    tooltip.remove();
  }, 1000);
}

function showNoteModal(jobId) {
  const job = currentJobs.find(j => (j.id || j.local_id) === jobId);
  if (!job) return;

  const note = prompt(`Add a note for ${job.company} - ${job.role}:`, job.notes || '');
  if (note !== null) {
    updateJobField(jobId, 'notes', note);
  }
}

function showJobDetails(jobId) {
  const job = currentJobs.find(j => (j.id || j.local_id) === jobId);
  if (!job) return;

  const details = `
Company: ${job.company}
Role: ${job.role}
Date Applied: ${formatDate(job.date_applied)}
Expectation: ${job.application_expectation}/5
Mood: ${job.mood}
Interviewed: ${job.interviewed ? 'Yes' : 'No'}
Offer Received: ${job.offered ? 'Yes' : 'No'}
Hired: ${job.got_job ? 'Yes' : 'No'}
${job.notes ? `Notes: ${job.notes}` : ''}
  `.trim();

  alert(details);
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getMoodEmoji(mood) {
  switch (mood) {
    case 'happy': return '😊';
    case 'sad': return '😢';
    case 'angry': return '😠';
    case 'neutral': return '😐';
    default: return '😐';
  }
}

function renderAnalytics() {
  const jobs = currentJobs || [];

  if (jobs.length === 0) {
    document.getElementById('jobsPerDayChart').style.display = 'none';
    avgExpectation.textContent = '0';
    successRate.textContent = '0%';
    return;
  }

  document.getElementById('jobsPerDayChart').style.display = 'block';

  const avgExp = jobs.reduce((sum, job) => sum + (job.application_expectation || 3), 0) / jobs.length;
  avgExpectation.textContent = avgExp.toFixed(1);

  const successCount = jobs.filter(job => job.interviewed).length;
  const successPercentage = jobs.length > 0 ? (successCount / jobs.length * 100).toFixed(1) : 0;
  successRate.textContent = `${successPercentage}%`;

  renderJobsPerDayChart();
}

function renderJobsPerDayChart() {
  const jobs = currentJobs || [];
  const counts = {};

  jobs.forEach(job => {
    if (job.date_applied) {
      counts[job.date_applied] = (counts[job.date_applied] || 0) + 1;
    }
  });

  const dates = Object.keys(counts).sort();
  const values = dates.map(date => counts[date]);

  const ctx = document.getElementById('jobsPerDayChart').getContext('2d');

  if (window.jobsPerDayChartInstance) {
    window.jobsPerDayChartInstance.destroy();
  }

  window.jobsPerDayChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates.map(date => formatChartDate(date)),
      datasets: [{
        label: 'Applications per Day',
        data: values,
        fill: true,
        borderColor: '#e67600',
        backgroundColor: 'rgba(230, 118, 0, 0.1)',
        tension: 0.4,
        pointBackgroundColor: '#e67600',
        pointBorderColor: '#052525',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(5, 37, 37, 0.9)',
          titleColor: '#e67600',
          bodyColor: 'white',
          borderColor: '#e67600',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          ticks: { color: '#a0aec0', maxTicksLimit: 6 }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          ticks: { color: '#a0aec0', stepSize: 1 }
        }
      }
    }
  });
}

function formatChartDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ================= STORAGE FUNCTIONS =================
async function saveToLocal(jobData) {
  const localJobs = await getLocalJobs();
  const jobWithUser = {
    ...jobData,
    local_id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  };

  localJobs.push(jobWithUser);
  await chrome.storage.local.set({ [LOCAL_JOBS_KEY]: localJobs });
  console.log('Saved job locally:', jobWithUser.local_id);
}

async function getLocalJobs() {
  try {
    const result = await chrome.storage.local.get(LOCAL_JOBS_KEY);
    const jobs = result[LOCAL_JOBS_KEY] || [];
    console.log('Retrieved local jobs:', jobs.length);
    return jobs;
  } catch (error) {
    console.error('Error getting local jobs:', error);
    return [];
  }
}

async function addToOfflineQueue(operation, data) {
  const queue = await getOfflineQueue();
  queue.push({ operation, data, timestamp: new Date().toISOString() });
  await chrome.storage.local.set({ [OFFLINE_QUEUE_KEY]: queue });
}

async function getOfflineQueue() {
  const result = await chrome.storage.local.get(OFFLINE_QUEUE_KEY);
  return result[OFFLINE_QUEUE_KEY] || [];
}

async function processOfflineQueue() {
  if (!isOnline()) return;

  const queue = await getOfflineQueue();
  if (queue.length === 0) return;

  const session = await getSession();
  if (!session) return;

  for (const item of queue) {
    try {
      if (item.operation === 'create') {
        await supabase.from('job_applications').insert([{ ...item.data, user_id: session.user.id }]);
      } else if (item.operation === 'update') {
        await supabase.from('job_applications')
          .update(item.data.update)
          .eq('id', item.data.id)
          .eq('user_id', session.user.id);
      }
    } catch (error) {
      console.error('Sync error:', error);
      break;
    }
  }

  const remainingQueue = queue.slice(1);
  await chrome.storage.local.set({ [OFFLINE_QUEUE_KEY]: remainingQueue });
}

// ================= UTILITY FUNCTIONS =================
function isOnline() {
  return navigator.onLine;
}

function updateSyncStatus() {
  const statusElement = document.getElementById('syncStatus');
  const statusText = document.getElementById('syncStatusText');

  if (!isOnline()) {
    statusElement.className = 'sync-indicator sync-offline';
    statusText.textContent = 'Offline';
  } else {
    statusElement.className = 'sync-indicator sync-online';
    statusText.textContent = 'Online';
  }
}

// ================= EVENT LISTENERS =================
window.addEventListener('online', () => {
  updateSyncStatus();
  processOfflineQueue();
  renderAll();
});

window.addEventListener('offline', () => {
  updateSyncStatus();
});

// Initial sync status
updateSyncStatus();