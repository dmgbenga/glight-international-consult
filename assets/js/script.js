'use strict';

const navigation = [
  { label: 'Home', href: 'index.html' },
  { label: 'About', href: 'about.html' },
  { label: 'For schools', href: 'school-partnerships.html' },
  { label: 'IT solutions', href: 'it-solutions.html' },
  { label: 'Contact', href: 'contact.html' }
];

const learningLinks = [
  { label: 'Coding & robotics', href: 'coding-robotics.html' },
  { label: 'STEM programmes', href: 'stem-programmes.html' },
  { label: 'Training & workshops', href: 'training-workshops.html' }
];

function renderLayout() {
  const header = document.querySelector('[data-site-header]');
  const footer = document.querySelector('[data-site-footer]');

  if (header) {
    const links = navigation.map(({ label, href }) =>
      `<a href="${href}">${label}</a>`
    ).join('');
    const learning = learningLinks.map(({ label, href }) =>
      `<a href="${href}">${label}</a>`
    ).join('');

    header.innerHTML = `
      <header class="site-header">
        <div class="container header-inner">
          <a class="brand" href="index.html" aria-label="Glight International Consult Limited home">
            <img class="brand-logo" src="assets/images/glight-logo.png" width="64" height="64" alt="Glight International Consult Limited logo">
            <span class="brand-copy"><strong>Glight International Consult Limited</strong><small>Glight Tech Mentors</small></span>
          </a>
          <button class="menu-toggle" type="button" aria-label="Open navigation menu" aria-expanded="false" aria-controls="site-navigation" data-menu-toggle><span class="menu-lines" aria-hidden="true"></span></button>
          <nav class="site-nav" id="site-navigation" aria-label="Main navigation">
            ${links}
            <details class="nav-dropdown">
              <summary>Learning</summary>
              <div class="dropdown-menu">${learning}</div>
            </details>
            <a class="nav-register" href="register.html">Register a student</a>
          </nav>
        </div>
      </header>`;

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    header.querySelectorAll('.site-nav > a:not(.nav-register), .dropdown-menu a').forEach((link) => {
      if (link.getAttribute('href') === currentPage) {
        link.setAttribute('aria-current', 'page');
        if (link.closest('.nav-dropdown')) {
          link.closest('.nav-dropdown').querySelector('summary').setAttribute('aria-current', 'page');
        }
      }
    });

    const menuButton = header.querySelector('[data-menu-toggle]');
    const nav = header.querySelector('#site-navigation');
    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      menuButton.setAttribute('aria-label', isOpen ? 'Open navigation menu' : 'Close navigation menu');
      nav.classList.toggle('is-open', !isOpen);
    });
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a') && window.matchMedia('(max-width: 1060px)').matches) {
        nav.classList.remove('is-open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Open navigation menu');
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        nav.classList.remove('is-open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Open navigation menu');
        nav.querySelector('details[open]')?.removeAttribute('open');
      }
    });
  }

  if (footer) {
    footer.innerHTML = `
      <footer class="site-footer">
        <div class="container footer-main">
          <div class="footer-brand">
            <a class="brand" href="index.html" aria-label="Glight International Consult Limited home">
              <img class="brand-logo" src="assets/images/glight-logo.png" width="64" height="64" alt="Glight International Consult Limited logo">
              <span class="brand-copy"><strong>Glight International Consult Limited</strong><small>Glight Tech Mentors</small></span>
            </a>
            <p>Education. Innovation. Technology.<br>Tech Mentor Your Child for the Future.</p>
          </div>
          <div><h2 class="footer-heading">Explore</h2><ul class="footer-links">
            <li><a href="about.html">About</a></li><li><a href="coding-robotics.html">Coding &amp; robotics</a></li>
            <li><a href="stem-programmes.html">STEM programmes</a></li><li><a href="school-partnerships.html">School partnerships</a></li>
            <li><a href="it-solutions.html">IT solutions</a></li><li><a href="training-workshops.html">Training &amp; workshops</a></li>
          </ul></div>
          <div><h2 class="footer-heading">Get started</h2><ul class="footer-links">
            <li><a href="register.html">Online student registration</a></li><li><a href="contact.html">Contact</a></li>
            <li><a href="privacy.html">Privacy notice</a></li><li><a href="admin.html">Admin sign in</a></li>
          </ul></div>
          <div><h2 class="footer-heading">Contact Glight</h2><ul class="footer-links">
            <li><a href="https://wa.me/2347067426404" target="_blank" rel="noopener noreferrer">WhatsApp: 07067426404</a></li>
            <li><a href="tel:08025675876">Phone: 08025675876</a></li>
            <li><a href="mailto:glightinternationalconsult@gmail.com">Email Glight</a></li>
          </ul><p class="footer-social">Instagram: <a href="https://www.instagram.com/glight_tech/" target="_blank" rel="noopener noreferrer">@glight_tech</a></p></div>
        </div>
        <div class="container footer-bottom"><p>&copy; ${new Date().getFullYear()} Glight International Consult Limited.</p><p>Learn. Build. Grow. Innovate. Shine.</p></div>
      </footer>`;
  }
}

function setupWallpaperCarousel() {
  const wallpaperSources = [
    'assets/images/tech-wallpaper-network.svg',
    'assets/images/tech-wallpaper-code.svg',
    'assets/images/tech-wallpaper-circuit.svg'
  ];

  document.querySelectorAll('.page-hero').forEach((hero) => {
    const content = hero.querySelector('.page-hero-content');
    if (!content || hero.querySelector('[data-wallpaper-carousel]')) return;

    const carousel = document.createElement('div');
    carousel.className = 'hero-wallpapers';
    carousel.setAttribute('data-wallpaper-carousel', '');
    carousel.setAttribute('aria-hidden', 'true');

    wallpaperSources.forEach((source, index) => {
      const image = document.createElement('img');
      image.className = `hero-wallpaper${index === 0 ? ' is-active' : ''}`;
      image.dataset.wallpaperSlide = '';
      image.src = source;
      image.alt = '';
      image.width = 1600;
      image.height = 900;
      carousel.append(image);
    });

    const toggle = document.createElement('button');
    toggle.className = 'wallpaper-toggle page-wallpaper-toggle';
    toggle.type = 'button';
    toggle.setAttribute('data-wallpaper-toggle', '');
    toggle.setAttribute('aria-label', 'Pause the technology wallpaper carousel');
    toggle.setAttribute('aria-pressed', 'false');
    toggle.hidden = true;
    toggle.innerHTML = '<span class="wallpaper-toggle-icon" aria-hidden="true">Ⅱ</span><span data-wallpaper-toggle-label>Pause wallpaper</span>';

    hero.prepend(carousel);
    content.append(toggle);
  });

  document.querySelectorAll('[data-wallpaper-carousel]').forEach((carousel) => {
    const toggle = carousel.parentElement.querySelector('[data-wallpaper-toggle]');
    const slides = Array.from(carousel.querySelectorAll('[data-wallpaper-slide]'));
    if (!toggle || slides.length < 2) return;

    let activeIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
    let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer;

    const updateToggle = () => {
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.setAttribute('aria-label', `${paused ? 'Play' : 'Pause'} the technology wallpaper carousel`);
      toggle.querySelector('[data-wallpaper-toggle-label]').textContent = paused ? 'Play wallpaper' : 'Pause wallpaper';
      toggle.querySelector('.wallpaper-toggle-icon').textContent = paused ? '▶' : 'Ⅱ';
    };

    const stop = () => {
      window.clearInterval(timer);
      timer = undefined;
    };

    const start = () => {
      stop();
      if (paused) return;
      timer = window.setInterval(() => {
        slides[activeIndex].classList.remove('is-active');
        activeIndex = (activeIndex + 1) % slides.length;
        slides[activeIndex].classList.add('is-active');
      }, 7000);
    };

    toggle.addEventListener('click', () => {
      paused = !paused;
      updateToggle();
      start();
    });

    toggle.hidden = false;
    updateToggle();
    start();
  });
}

function renderAnnouncements() {
  const list = document.querySelector('[data-announcements]');
  if (!list) return;

  const showStatus = (message) => {
    list.replaceChildren();
    const status = document.createElement('p');
    status.className = 'notice-card';
    status.setAttribute('data-announcements-status', '');
    status.textContent = message;
    list.append(status);
  };

  fetch('assets/data/announcements.json', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error('Announcements could not be loaded.');
      return response.json();
    })
    .then((announcements) => {
      if (!Array.isArray(announcements)) throw new Error('Announcements have an invalid format.');
      if (announcements.length === 0) {
        showStatus('No announcements right now. Please check back for future updates.');
        return;
      }
      if (announcements.some((item) =>
        !item || typeof item.title !== 'string' || item.title.trim().length === 0 ||
        typeof item.summary !== 'string' || item.summary.trim().length === 0 ||
        (item.date !== undefined && (typeof item.date !== 'string' || Number.isNaN(new Date(item.date).getTime()))) ||
        (item.url !== undefined && typeof item.url !== 'string'))) {
        throw new Error('Announcements have an invalid format.');
      }

      list.replaceChildren();
      announcements.forEach((announcement) => {
        const card = document.createElement('article');
        card.className = 'announcement-card';
        if (typeof announcement.date === 'string') {
          const date = new Date(announcement.date);
          if (!Number.isNaN(date.getTime())) {
            const time = document.createElement('time');
            time.dateTime = announcement.date;
            time.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
            card.append(time);
          }
        }
        const title = document.createElement('h3');
        title.textContent = announcement.title;
        const summary = document.createElement('p');
        summary.textContent = announcement.summary;
        card.append(title, summary);

        if (typeof announcement.url === 'string' && announcement.url.length > 0) {
          const target = new URL(announcement.url, window.location.href);
          if (target.protocol !== 'https:' && target.origin !== window.location.origin) {
            throw new Error('Announcements contain an invalid link.');
          }
          const link = document.createElement('a');
          link.className = 'text-link';
          link.href = target.href;
          link.textContent = 'Read update';
          card.append(link);
        }
        list.append(card);
      });
    })
    .catch(() => showStatus('Announcements are unavailable right now. Please try again later.'));
}

function getField(form, name) {
  return form.elements.namedItem(name);
}

function showFeedback(element, message, state) {
  if (!element) return;
  element.textContent = message;
  if (state) element.dataset.state = state;
  else delete element.dataset.state;
}

function setupRegistrationForm() {
  const form = document.querySelector('[data-registration-form]');
  if (!form) return;

  const feedback = document.querySelector('[data-registration-feedback]');
  form.addEventListener('input', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
      event.target.setCustomValidity('');
    }
    if (feedback && feedback.dataset.state !== 'success') showFeedback(feedback, '');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submit = form.querySelector('[type="submit"]');
    const payload = {
      parentName: getField(form, 'parentName').value.trim(),
      parentEmail: getField(form, 'parentEmail').value.trim(),
      parentPhone: getField(form, 'parentPhone').value.trim(),
      studentName: getField(form, 'studentName').value.trim(),
      age: Number(getField(form, 'age').value),
      className: getField(form, 'className').value.trim(),
      programme: getField(form, 'programme').value,
      learningMode: getField(form, 'learningMode').value,
      guardianConsent: getField(form, 'guardianConsent').checked,
      website: getField(form, 'website').value
    };

    submit.disabled = true;
    showFeedback(feedback, 'Submitting registration...');
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      let result;
      try {
        result = await response.json();
      } catch (error) {
        throw new Error('The registration service returned an invalid response.');
      }
      if (!response.ok) {
        if (result.fields && typeof result.fields === 'object') {
          Object.entries(result.fields).forEach(([name, message]) => {
            const field = getField(form, name);
            if (field && typeof message === 'string') field.setCustomValidity(message);
          });
        }
        showFeedback(feedback, result.error || 'Registration could not be submitted. Please check the form and try again.');
        return;
      }
      if (typeof result.reference !== 'string' || !/^GL-\d{4}-[A-F0-9]{12}$/.test(result.reference)) {
        throw new Error('The registration service returned an invalid confirmation. Please contact Glight.');
      }

      form.reset();
      feedback.replaceChildren();
      feedback.dataset.state = 'success';
      const confirmation = document.createElement('div');
      confirmation.className = 'registration-success';
      const heading = document.createElement('strong');
      heading.textContent = 'Registration received';
      const detail = document.createElement('span');
      detail.textContent = 'Keep this reference for your records:';
      const reference = document.createElement('code');
      reference.textContent = result.reference;
      confirmation.append(heading, detail, reference);
      feedback.append(confirmation);
    } catch (error) {
      showFeedback(feedback, 'Registration could not be submitted right now. Please try again later or contact Glight by phone or email.');
    } finally {
      submit.disabled = false;
    }
  });
}

function setupAdminDashboard() {
  const loginForm = document.querySelector('[data-admin-login]');
  if (!loginForm) return;

  const panel = document.querySelector('[data-admin-panel]');
  const loading = document.querySelector('[data-admin-loading]');
  const identity = document.querySelector('[data-admin-identity]');
  const tableBody = document.querySelector('[data-admin-registrations]');
  const feedback = document.querySelector('[data-admin-feedback]');
  const loginFeedback = document.querySelector('[data-admin-login-feedback]');
  const filter = document.querySelector('[data-admin-filter]');
  const previous = document.querySelector('[data-admin-previous]');
  const next = document.querySelector('[data-admin-next]');
  const pageLabel = document.querySelector('[data-admin-page]');
  let offset = 0;
  const pageSize = 25;

  async function request(url, options) {
    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'same-origin',
      ...options
    });
    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error('The server returned an invalid response. Please refresh the page and try again.');
    }
    if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
    return result;
  }

  function addTextCell(row, value, strong) {
    const cell = document.createElement('td');
    const text = document.createElement(strong ? 'strong' : 'span');
    text.textContent = value || '';
    cell.append(text);
    row.append(cell);
    return cell;
  }

  function addDetailCell(row, primary, secondary, linkPrefix) {
    const cell = document.createElement('td');
    const main = document.createElement('strong');
    main.textContent = primary || '';
    const detail = document.createElement(linkPrefix ? 'a' : 'small');
    detail.textContent = secondary || '';
    if (linkPrefix && secondary) detail.href = `${linkPrefix}${secondary}`;
    if (linkPrefix) detail.className = 'admin-detail-link';
    cell.append(main, detail);
    row.append(cell);
    return cell;
  }

  function renderRows(registrations) {
    tableBody.replaceChildren();
    if (registrations.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 6;
      cell.textContent = 'No registrations match this filter.';
      row.append(cell);
      tableBody.append(row);
      return;
    }

    registrations.forEach((record) => {
      const row = document.createElement('tr');
      const reference = document.createElement('td');
      const referenceText = document.createElement('strong');
      referenceText.textContent = record.reference;
      const received = document.createElement('small');
      const date = new Date(record.created_at);
      received.textContent = Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
      reference.append(referenceText, received);
      row.append(reference);

      const student = document.createElement('td');
      const studentName = document.createElement('strong');
      studentName.textContent = record.student_name;
      const studentDetails = document.createElement('small');
      studentDetails.textContent = `Age ${record.age} · ${record.class_name}`;
      student.append(studentName, studentDetails);
      row.append(student);

      addTextCell(row, record.programme, false);
      const parentCell = addDetailCell(row, record.parent_name, record.parent_email, 'mailto:');
      const phoneLink = document.createElement('a');
      phoneLink.href = `tel:${record.parent_phone}`;
      phoneLink.textContent = record.parent_phone;
      phoneLink.className = 'admin-detail-link';
      parentCell.append(phoneLink);
      const consent = document.createElement('small');
      consent.textContent = record.guardian_consent
        ? `Guardian consent recorded${record.guardian_consent_at ? ` · ${new Date(record.guardian_consent_at).toLocaleDateString()}` : ''}`
        : 'Guardian consent not recorded';
      parentCell.append(consent);
      const learningCell = document.createElement('td');
      learningCell.textContent = record.learning_mode === 'physical' ? 'Physical · Abuja' : 'Online';
      row.append(learningCell);
      const statusCell = document.createElement('td');
      const status = document.createElement('select');
      status.className = 'status-select';
      status.setAttribute('aria-label', `Registration status for ${record.reference}`);
      [['pending', 'Pending'], ['contacted', 'Contacted'], ['registered', 'Registered'], ['closed', 'Closed']].forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.selected = record.status === value;
        status.append(option);
      });
      status.addEventListener('change', async () => {
        const oldValue = record.status;
        status.disabled = true;
        try {
          await request(`/api/admin/registrations?id=${encodeURIComponent(record.id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: status.value })
          });
          record.status = status.value;
          showFeedback(feedback, `Registration ${record.reference} updated.`, 'success');
        } catch (error) {
          status.value = oldValue;
          showFeedback(feedback, error.message);
        } finally {
          status.disabled = false;
        }
      });
      statusCell.append(status);
      row.append(statusCell);
      tableBody.append(row);
    });
  }

  async function loadRegistrations() {
    const query = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
    if (filter.value) query.set('status', filter.value);
    showFeedback(feedback, 'Loading registrations...');
    document.querySelector('[data-admin-refresh]').disabled = true;
    try {
      const result = await request(`/api/admin/registrations?${query.toString()}`);
      renderRows(result.registrations);
      const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
      pageLabel.textContent = `Page ${Math.floor(offset / pageSize) + 1} of ${totalPages}`;
      previous.disabled = offset === 0;
      next.disabled = offset + pageSize >= result.total;
      showFeedback(feedback, `${result.total} registration${result.total === 1 ? '' : 's'} found.`, 'success');
    } catch (error) {
      renderRows([]);
      showFeedback(feedback, error.message);
    } finally {
      document.querySelector('[data-admin-refresh]').disabled = false;
    }
  }

  function showDashboard(user) {
    loading.hidden = true;
    loginForm.hidden = true;
    panel.hidden = false;
    identity.textContent = user.email || 'Signed in administrator';
    loadRegistrations();
  }

  request('/api/admin/session', { method: 'GET' })
    .then((result) => {
      if (result.authenticated) showDashboard(result.user);
      else {
        loading.hidden = true;
        loginForm.hidden = false;
      }
    })
    .catch(() => {
      loading.textContent = 'Administrator access could not be checked. Please refresh the page.';
    });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    const submit = loginForm.querySelector('[type="submit"]');
    submit.disabled = true;
    showFeedback(loginFeedback, 'Signing in...');
    try {
      const result = await request('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: loginForm.elements.namedItem('email').value.trim(),
          password: loginForm.elements.namedItem('password').value
        })
      });
      loginForm.reset();
      showDashboard(result.user);
    } catch (error) {
      showFeedback(loginFeedback, error.message);
    } finally {
      submit.disabled = false;
    }
  });

  document.querySelector('[data-admin-logout]').addEventListener('click', async () => {
    try {
      await request('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
      panel.hidden = true;
      loginForm.hidden = false;
      showFeedback(loginFeedback, 'You have signed out.', 'success');
    } catch (error) {
      showFeedback(feedback, error.message);
    }
  });

  document.querySelector('[data-admin-refresh]').addEventListener('click', loadRegistrations);
  filter.addEventListener('change', () => {
    offset = 0;
    loadRegistrations();
  });
  previous.addEventListener('click', () => {
    offset = Math.max(0, offset - pageSize);
    loadRegistrations();
  });
  next.addEventListener('click', () => {
    offset += pageSize;
    loadRegistrations();
  });
}

renderLayout();
setupWallpaperCarousel();
renderAnnouncements();
setupRegistrationForm();
setupAdminDashboard();
