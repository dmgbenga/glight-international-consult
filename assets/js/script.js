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
            <span class="brand-copy"><strong>Glight International Consult Limited</strong></span>
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
        <div class="container footer-subscribe">
          <div>
            <p class="eyebrow">Stay connected</p>
            <h2>Get Glight updates and opportunities.</h2>
            <p>Subscribe via WhatsApp for programme news, events and ways to get involved.</p>
          </div>
          <a class="button button-gold" href="https://wa.me/2347067426404?text=Hello%20Glight%2C%20I%20would%20like%20to%20subscribe%20to%20Glight%20updates%20and%20opportunities." target="_blank" rel="noopener noreferrer">Subscribe on WhatsApp <span aria-hidden="true">&nearr;</span></a>
        </div>
        <div class="container footer-main">
          <div class="footer-brand">
            <a class="brand" href="index.html" aria-label="Glight International Consult Limited home">
              <img class="brand-logo" src="assets/images/glight-logo.png" width="64" height="64" alt="Glight International Consult Limited logo">
              <span class="brand-copy"><strong>Glight International Consult Limited</strong></span>
            </a>
            <p>Education. Innovation. Technology.<br>Tech Mentor Your Child for the Future.</p>
          </div>
          <div><h2 class="footer-heading">Explore</h2><ul class="footer-links">
            <li><a href="about.html">About</a></li><li><a href="coding-robotics.html">Coding &amp; robotics</a></li>
            <li><a href="school-partnerships.html">School partnerships</a></li>
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

function setupPhotoCarousel() {
  document.querySelectorAll('[data-photo-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('[data-photo-track]');
    const slides = Array.from(carousel.querySelectorAll('[data-photo-slide]'));
    const previous = carousel.querySelector('[data-photo-prev]');
    const next = carousel.querySelector('[data-photo-next]');
    const status = carousel.querySelector('[data-photo-status]');
    const controls = carousel.querySelector('.photo-carousel-controls');
    if (!track || slides.length === 0 || !previous || !next || !status || !controls) return;

    const getStep = () => {
      const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
      return slides[0].getBoundingClientRect().width + gap;
    };
    const updateControls = () => {
      const index = Math.min(slides.length - 1, Math.max(0, Math.round(track.scrollLeft / getStep())));
      status.textContent = `Slide ${index + 1} of ${slides.length}`;
      previous.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    };

    const scrollTrack = (direction) => {
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      track.scrollBy({ left: direction * getStep(), behavior });
    };

    previous.addEventListener('click', () => scrollTrack(-1));
    next.addEventListener('click', () => scrollTrack(1));
    track.addEventListener('scroll', updateControls, { passive: true });
    window.addEventListener('resize', updateControls);
    slides.forEach((slide, index) => slide.setAttribute('aria-label', `Slide ${index + 1} of ${slides.length}`));
    controls.hidden = false;
    updateControls();
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
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement) {
      event.target.setCustomValidity('');
    }
    if (feedback && feedback.dataset.state !== 'success') showFeedback(feedback, '');
  });

  let submitting = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!form.reportValidity()) return;

    const submit = form.querySelector('[type="submit"]');
    const submitLabel = form.querySelector('[data-submit-label]');
    const submitSpinner = form.querySelector('[data-submit-spinner]');
    const payload = {
      parentName: getField(form, 'parentName').value.trim(),
      parentEmail: getField(form, 'parentEmail').value.trim(),
      parentPhone: getField(form, 'parentPhone').value.trim(),
      studentName: getField(form, 'studentName').value.trim(),
      age: Number(getField(form, 'age').value),
      className: getField(form, 'className').value.trim(),
      additionalInformation: getField(form, 'additionalInformation').value.trim(),
      programme: getField(form, 'programme').value,
      learningMode: getField(form, 'learningMode').value,
      guardianConsent: getField(form, 'guardianConsent').checked,
      website: getField(form, 'website').value
    };

    submitting = true;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submitLabel.textContent = 'Submitting...';
    submitSpinner.hidden = false;
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
      const emailNotice = document.createElement('span');
      if (result.emailStatus === 'sent') {
        emailNotice.textContent = `A confirmation email was sent to ${payload.parentEmail}.`;
      } else if (result.emailStatus === 'not_configured') {
        emailNotice.textContent = 'Your registration was saved, but email notifications are not configured yet. Keep your reference and contact Glight if you need help.';
      } else {
        emailNotice.textContent = 'Your registration was saved, but email delivery could not be confirmed. Keep your reference and please do not submit it again.';
      }
      const sheetNotice = document.createElement('span');
      if (result.sheetStatus === 'appended') {
        sheetNotice.textContent = 'Your registration details were also added to Glight’s tracking sheet.';
      } else if (result.sheetStatus === 'not_configured') {
        sheetNotice.textContent = 'Your registration was saved, but its spreadsheet copy is not configured yet. Keep your reference and please do not submit it again.';
      } else {
        sheetNotice.textContent = 'Your registration was saved, but the spreadsheet copy could not be confirmed. Keep your reference and please do not submit it again.';
      }
      confirmation.append(heading, detail, reference, emailNotice, sheetNotice);
      feedback.append(confirmation);
    } catch (error) {
      showFeedback(feedback, 'Registration could not be submitted right now. Please try again later or contact Glight by phone or email.');
    } finally {
      submitting = false;
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submitLabel.textContent = 'Submit registration';
      submitSpinner.hidden = true;
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
  const filterForm = document.querySelector('[data-admin-filter-form]');
  const filter = document.querySelector('[data-admin-filter]');
  const searchInput = document.querySelector('[data-admin-search]');
  const programmeFilter = document.querySelector('[data-admin-programme]');
  const learningModeFilter = document.querySelector('[data-admin-learning-mode]');
  const previous = document.querySelector('[data-admin-previous]');
  const next = document.querySelector('[data-admin-next]');
  const pageLabel = document.querySelector('[data-admin-page]');
  const totalCount = document.querySelector('[data-admin-total]');
  const pendingCount = document.querySelector('[data-admin-pending]');
  const refreshButton = document.querySelector('[data-admin-refresh]');
  const resetButton = document.querySelector('[data-admin-reset]');
  const exportButton = document.querySelector('[data-admin-export]');
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
      cell.colSpan = 8;
      cell.textContent = 'No registrations match these filters.';
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
      studentDetails.textContent = `Age ${record.student_age} · ${record.student_class}`;
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
      consent.textContent = record.parental_consent
        ? `Guardian consent recorded${record.guardian_consent_at ? ` · ${new Date(record.guardian_consent_at).toLocaleDateString()}` : ''}`
        : 'Guardian consent not recorded';
      parentCell.append(consent);
      const learningCell = document.createElement('td');
      learningCell.textContent = record.learning_mode === 'Physical' ? 'Physical · Abuja' : 'Online';
      row.append(learningCell);

      const additionalCell = document.createElement('td');
      const additional = document.createElement('small');
      additional.className = 'admin-additional-info';
      additional.textContent = record.additional_information || '—';
      additionalCell.append(additional);
      row.append(additionalCell);

      const statusCell = document.createElement('td');
      const status = document.createElement('select');
      status.className = 'status-select';
      status.setAttribute('aria-label', `Registration status for ${record.reference}`);
      [['Pending', 'Pending'], ['Contacted', 'Contacted'], ['Approved', 'Approved'], ['Rejected', 'Rejected']].forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.selected = record.application_status === value;
        status.append(option);
      });
      if (!['Pending', 'Contacted', 'Approved', 'Rejected'].includes(record.application_status)) {
        const legacyStatus = document.createElement('option');
        legacyStatus.value = record.application_status;
        legacyStatus.textContent = `${record.application_status} (legacy)`;
        legacyStatus.selected = true;
        legacyStatus.disabled = true;
        status.append(legacyStatus);
      }
      status.addEventListener('change', async () => {
        const oldValue = record.application_status;
        status.disabled = true;
        try {
          await request(`/api/admin/registrations?id=${encodeURIComponent(record.id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: status.value })
          });
          record.application_status = status.value;
          const refreshError = await loadRegistrations();
          if (refreshError) {
            showFeedback(feedback, `Registration ${record.reference} was updated, but the list could not refresh: ${refreshError.message}`);
          } else {
            showFeedback(feedback, `Registration ${record.reference} updated.`, 'success');
          }
        } catch (error) {
          status.value = oldValue;
          showFeedback(feedback, error.message);
        } finally {
          status.disabled = false;
        }
      });
      statusCell.append(status);
      row.append(statusCell);

      const actions = document.createElement('td');
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'admin-delete-button';
      deleteButton.textContent = 'Delete';
      deleteButton.setAttribute('aria-label', `Delete registration ${record.reference}`);
      deleteButton.addEventListener('click', async () => {
        if (!window.confirm(`Permanently delete registration ${record.reference}? This cannot be undone.`)) return;
        deleteButton.disabled = true;
        try {
          await request(`/api/admin/registrations?id=${encodeURIComponent(record.id)}`, { method: 'DELETE' });
          if (offset > 0 && registrations.length === 1) offset = Math.max(0, offset - pageSize);
          const refreshError = await loadRegistrations();
          if (refreshError) {
            showFeedback(feedback, `Registration ${record.reference} was deleted, but the list could not refresh: ${refreshError.message}`);
          } else {
            showFeedback(feedback, `Registration ${record.reference} deleted.`, 'success');
          }
        } catch (error) {
          showFeedback(feedback, error.message);
        } finally {
          deleteButton.disabled = false;
        }
      });
      actions.append(deleteButton);
      row.append(actions);
      tableBody.append(row);
    });
  }

  function getActiveFilters() {
    const query = new URLSearchParams();
    if (searchInput.value.trim()) query.set('search', searchInput.value.trim());
    if (programmeFilter.value) query.set('programme', programmeFilter.value);
    if (learningModeFilter.value) query.set('learningMode', learningModeFilter.value);
    if (filter.value) query.set('status', filter.value);
    return query;
  }

  async function loadRegistrations() {
    const query = getActiveFilters();
    query.set('limit', String(pageSize));
    query.set('offset', String(offset));
    showFeedback(feedback, 'Loading registrations...');
    refreshButton.disabled = true;
    try {
      const result = await request(`/api/admin/registrations?${query.toString()}`);
      if (!Array.isArray(result.registrations) || !result.summary) {
        throw new Error('The registration service returned incomplete dashboard data.');
      }
      renderRows(result.registrations);
      const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
      pageLabel.textContent = `Page ${Math.floor(offset / pageSize) + 1} of ${totalPages}`;
      totalCount.textContent = String(result.summary.totalRegistrations);
      pendingCount.textContent = String(result.summary.pendingApplications);
      previous.disabled = offset === 0;
      next.disabled = offset + pageSize >= result.total;
      showFeedback(feedback, `${result.total} registration${result.total === 1 ? '' : 's'} found.`, 'success');
      return null;
    } catch (error) {
      renderRows([]);
      showFeedback(feedback, error.message);
      return error;
    } finally {
      refreshButton.disabled = false;
    }
  }

  async function exportCsv() {
    const query = getActiveFilters();
    query.set('format', 'csv');
    exportButton.disabled = true;
    showFeedback(feedback, 'Preparing registration export...');
    try {
      const response = await fetch(`/api/admin/registrations?${query.toString()}`, {
        cache: 'no-store',
        credentials: 'same-origin'
      });
      if (!response.ok) {
        let result;
        try {
          result = await response.json();
        } catch (error) {
          throw new Error('The export service returned an invalid response.');
        }
        throw new Error(result.error || 'The export could not be completed.');
      }
      const blob = await response.blob();
      if (!blob.type.toLowerCase().includes('text/csv')) {
        throw new Error('The export service returned an unexpected file type.');
      }
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `glight-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
      showFeedback(feedback, 'The CSV export has been downloaded.', 'success');
    } catch (error) {
      showFeedback(feedback, error.message);
    } finally {
      exportButton.disabled = false;
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

  filterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    offset = 0;
    loadRegistrations();
  });
  resetButton.addEventListener('click', () => {
    filterForm.reset();
    offset = 0;
    loadRegistrations();
  });
  refreshButton.addEventListener('click', loadRegistrations);
  exportButton.addEventListener('click', exportCsv);
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
setupPhotoCarousel();
renderAnnouncements();
setupRegistrationForm();
setupAdminDashboard();
