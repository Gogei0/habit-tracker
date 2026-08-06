(() => {
  'use strict';

  const KONFIG = window.FAMILIENBRETT_KONFIG || {};
  const LOKALER_SCHLUESSEL = 'mach_ma_prototyp_v2_strikt';
  const SITZUNGS_SCHLUESSEL = 'mach_ma_familienzugang_v1';
  const FARBEN = ['#e8b86e', '#83b79b', '#8fb7cf', '#d89a95', '#b39acb', '#d3ab72'];
  const ZETTELFARBEN = { gelb: 'var(--gelb)', rosa: 'var(--rosa)', blau: 'var(--blau)', gruen: 'var(--gruen)' };
  const PROJEKTFARBEN = { creme: 'var(--creme)', salbei: 'var(--salbei)', himmel: 'var(--himmel)' };

  let zustand = demoDaten();
  let aktiveAnsicht = 'uebersicht';
  let ausgewaehltesDatum = heute();
  let projektFilter = 'aktiv';
  let cloudClient = null;
  let zugangToken = '';
  let cloudZeitstempel = '';
  let speicherTimer = null;
  let toastTimer = null;
  const filter = { status: 'offen', person: 'alle', bereich: 'alle', suche: '' };

  function heute(offset = 0) {
    const datum = new Date();
    datum.setHours(12, 0, 0, 0);
    datum.setDate(datum.getDate() + offset);
    return datum.toISOString().slice(0, 10);
  }

  function id(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function demoDaten() {
    const mitglieder = [
      { id: 'm_anna', name: 'Anna', avatar: '👩', farbe: '#d89a95' },
      { id: 'm_lukas', name: 'Lukas', avatar: '👨', farbe: '#8fb7cf' },
      { id: 'm_mia', name: 'Mia', avatar: '👧', farbe: '#b39acb' },
      { id: 'm_noah', name: 'Noah', avatar: '👦', farbe: '#83b79b' }
    ];
    const projekte = [
      {
        id: 'p_balkon', titel: 'Balkon neu gestalten', beschreibung: 'Eine gemütliche grüne Ecke für gemeinsame Sommerabende.',
        faellig: heute(24), verantwortlich: 'm_anna', mitglieder: ['m_anna', 'm_lukas'], farbe: 'salbei', erstelltAm: Date.now() - 86400000 * 8,
        etappen: [
          { id: 'e_b1', titel: 'Ideen und Maße sammeln', erledigt: true },
          { id: 'e_b2', titel: 'Pflanzen auswählen', erledigt: true },
          { id: 'e_b3', titel: 'Möbel aufbauen', erledigt: false },
          { id: 'e_b4', titel: 'Lichter anbringen', erledigt: false }
        ]
      },
      {
        id: 'p_geburtstag', titel: 'Mias Geburtstag', beschreibung: 'Die Feier im Garten planen, ohne dass etwas untergeht.',
        faellig: heute(11), verantwortlich: 'm_lukas', mitglieder: ['m_anna', 'm_lukas', 'm_noah'], farbe: 'creme', erstelltAm: Date.now() - 86400000 * 5,
        etappen: [
          { id: 'e_g1', titel: 'Gästeliste festlegen', erledigt: true },
          { id: 'e_g2', titel: 'Einladungen verschicken', erledigt: true },
          { id: 'e_g3', titel: 'Kuchen und Snacks planen', erledigt: false },
          { id: 'e_g4', titel: 'Garten vorbereiten', erledigt: false }
        ]
      },
      {
        id: 'p_keller', titel: 'Keller ordnen', beschreibung: 'Platz schaffen und Dinge weitergeben, die wir nicht mehr brauchen.',
        faellig: heute(39), verantwortlich: 'm_lukas', mitglieder: ['m_lukas', 'm_anna'], farbe: 'himmel', erstelltAm: Date.now() - 86400000 * 14,
        etappen: [
          { id: 'e_k1', titel: 'Kisten beschriften', erledigt: true },
          { id: 'e_k2', titel: 'Werkzeug sortieren', erledigt: false },
          { id: 'e_k3', titel: 'Spendenkiste wegbringen', erledigt: false }
        ]
      }
    ];
    const aufgaben = [
      { id: 'a_1', titel: 'Spülmaschine ausräumen', beschreibung: 'Bitte das Frühstücksgeschirr direkt mit einräumen.', personen: ['m_noah', 'm_mia'], bereich: 'Küche', faellig: heute(), prioritaet: 'normal', farbe: 'gelb', projektId: '', erledigt: false, erstelltAm: Date.now() - 3600000 * 4 },
      { id: 'a_2', titel: 'Balkonpflanzen gießen', beschreibung: 'Auch die Kräuter neben der Balkontür.', personen: ['m_anna'], bereich: 'Garten', faellig: heute(), prioritaet: 'hoch', farbe: 'gruen', projektId: 'p_balkon', erledigt: false, erstelltAm: Date.now() - 3600000 * 3 },
      { id: 'a_3', titel: 'Wocheneinkauf planen', beschreibung: 'Milch, Obst und Brot fehlen bereits.', personen: [], ganzeFamilie: true, bereich: 'Einkauf', faellig: heute(), prioritaet: 'normal', farbe: 'blau', projektId: '', erledigt: false, erstelltAm: Date.now() - 3600000 * 2 },
      { id: 'a_4', titel: 'Einladungen gestalten', beschreibung: 'Mia möchte gern Blumen und Sterne auf der Karte.', personen: ['m_mia', 'm_anna'], bereich: 'Organisation', faellig: heute(1), prioritaet: 'hoch', farbe: 'rosa', projektId: 'p_geburtstag', erledigt: false, erstelltAm: Date.now() - 86400000 },
      { id: 'a_5', titel: 'Papiermüll rausbringen', beschreibung: '', personen: ['m_noah'], bereich: 'Sonstiges', faellig: heute(1), prioritaet: 'normal', farbe: 'gelb', projektId: '', erledigt: false, erstelltAm: Date.now() - 86400000 * 2 },
      { id: 'a_6', titel: 'Werkzeugkiste durchsehen', beschreibung: 'Defektes Werkzeug aussortieren.', personen: ['m_lukas'], bereich: 'Sonstiges', faellig: heute(3), prioritaet: 'niedrig', farbe: 'blau', projektId: 'p_keller', erledigt: false, erstelltAm: Date.now() - 86400000 * 3 },
      { id: 'a_7', titel: 'Handtücher wechseln', beschreibung: '', personen: ['m_anna', 'm_lukas'], bereich: 'Bad', faellig: heute(-1), prioritaet: 'hoch', farbe: 'rosa', projektId: '', erledigt: false, erstelltAm: Date.now() - 86400000 * 4 },
      { id: 'a_8', titel: 'Esstisch abwischen', beschreibung: '', personen: ['m_mia'], bereich: 'Küche', faellig: heute(-1), prioritaet: 'normal', farbe: 'gruen', projektId: '', erledigt: true, erledigtAm: Date.now() - 86400000, erstelltAm: Date.now() - 86400000 * 2 }
    ];
    return {
      version: 1,
      haushalt: { name: 'Familie Sommer' },
      mitglieder,
      bereiche: ['Küche', 'Bad', 'Wohnzimmer', 'Garten', 'Einkauf', 'Organisation', 'Sonstiges'],
      aufgaben,
      projekte,
      aktivitaeten: [
        { id: 'ak_1', person: 'm_mia', text: 'hat „Esstisch abwischen“ erledigt', zeit: Date.now() - 1000 * 60 * 42 },
        { id: 'ak_2', person: 'm_lukas', text: 'hat eine Etappe in „Keller ordnen“ abgehakt', zeit: Date.now() - 1000 * 60 * 60 * 3 },
        { id: 'ak_3', person: 'm_anna', text: 'hat „Balkon neu gestalten“ bearbeitet', zeit: Date.now() - 1000 * 60 * 60 * 22 }
      ]
    };
  }

  function normalisieren(daten) {
    const basis = demoDaten();
    const wert = daten && typeof daten === 'object' ? daten : {};
    return {
      version: 1,
      haushalt: { ...basis.haushalt, ...(wert.haushalt || {}) },
      mitglieder: Array.isArray(wert.mitglieder) && wert.mitglieder.length ? wert.mitglieder : basis.mitglieder,
      bereiche: Array.isArray(wert.bereiche) && wert.bereiche.length ? wert.bereiche : basis.bereiche,
      aufgaben: (Array.isArray(wert.aufgaben) ? wert.aufgaben : basis.aufgaben).map(aufgabe => ({
        ...aufgabe,
        personen: Array.isArray(aufgabe.personen) ? aufgabe.personen : (aufgabe.person ? [aufgabe.person] : []),
        ganzeFamilie: Boolean(aufgabe.ganzeFamilie)
      })),
      projekte: Array.isArray(wert.projekte) ? wert.projekte : basis.projekte,
      aktivitaeten: Array.isArray(wert.aktivitaeten) ? wert.aktivitaeten.slice(0, 30) : basis.aktivitaeten
    };
  }

  const cloudKonfiguriert = () => Boolean(KONFIG.supabaseUrl && KONFIG.supabaseAnonKey && window.supabase);
  const cloudAktiv = () => Boolean(cloudKonfiguriert() && zugangToken);

  function sitzungLaden() {
    try {
      const sitzung = JSON.parse(localStorage.getItem(SITZUNGS_SCHLUESSEL) || '{}');
      zugangToken = typeof sitzung.token === 'string' ? sitzung.token : '';
      document.getElementById('zugang-code').value = typeof sitzung.code === 'string' ? sitzung.code : '';
    } catch (_) { zugangToken = ''; }
  }

  function zugangAnzeigen(statusText = '') {
    const tor = document.getElementById('zugang-tor');
    tor.classList.add('sichtbar');
    document.querySelector('.brett-buehne').setAttribute('inert', '');
    document.getElementById('zugang-status').textContent = statusText;
  }

  function zugangVerbergen() {
    document.getElementById('zugang-tor').classList.remove('sichtbar');
    document.querySelector('.brett-buehne').removeAttribute('inert');
    document.getElementById('zugang-status').textContent = '';
  }

  async function zugangPruefen(event) {
    event.preventDefault();
    if (!cloudKonfiguriert()) {
      zugangAnzeigen('Der gemeinsame Speicher wird gerade eingerichtet. Bitte später erneut versuchen.');
      return;
    }
    const code = document.getElementById('zugang-code').value.trim().toUpperCase();
    const pin = document.getElementById('zugang-pin').value.trim();
    const knopf = event.submitter || event.currentTarget.querySelector('button[type="submit"]');
    knopf.disabled = true;
    document.getElementById('zugang-status').textContent = 'Zugang wird geprüft …';
    try {
      cloudClient ||= window.supabase.createClient(KONFIG.supabaseUrl, KONFIG.supabaseAnonKey);
      const { data, error } = await cloudClient.rpc('login_familienbrett', { p_board_code: code, p_pin: pin });
      if (error) throw error;
      const zeile = Array.isArray(data) ? data[0] : data;
      if (!zeile?.access_token) throw new Error('invalid_family_access');
      zugangToken = zeile.access_token;
      localStorage.setItem(SITZUNGS_SCHLUESSEL, JSON.stringify({ token: zugangToken, code }));
      document.getElementById('zugang-pin').value = '';
      await datenLaden();
      allesRendern();
      ansichtWechseln('uebersicht');
    } catch (_) {
      zugangToken = '';
      localStorage.removeItem(SITZUNGS_SCHLUESSEL);
      zugangAnzeigen('Code oder PIN stimmen nicht. Bitte noch einmal prüfen.');
    } finally { knopf.disabled = false; }
  }

  async function datenLaden() {
    if (KONFIG.requireCloudAccess && !cloudKonfiguriert()) {
      statusSetzen('', 'Noch nicht verbunden', 'Supabase wird eingerichtet');
      zugangAnzeigen('Der gemeinsame Speicher wird gerade eingerichtet.');
      return false;
    }
    if (KONFIG.requireCloudAccess && !zugangToken) {
      statusSetzen('', 'Anmeldung erforderlich', 'Familiencode und PIN eingeben');
      zugangAnzeigen('');
      return false;
    }
    if (cloudAktiv()) {
      statusSetzen('laden', 'Gemeinsamer Haushalt', 'Daten werden geladen …');
      try {
        cloudClient = window.supabase.createClient(KONFIG.supabaseUrl, KONFIG.supabaseAnonKey);
        const { data, error } = await cloudClient.rpc('load_familienbrett_state', { p_access_token: zugangToken });
        if (error) throw error;
        const zeile = Array.isArray(data) ? data[0] : data;
        if (zeile && zeile.data) {
          zustand = normalisieren(zeile.data);
          cloudZeitstempel = zeile.updated_at || '';
        } else {
          await inCloudSpeichern(true);
        }
        statusSetzen('cloud', 'Gemeinsamer Haushalt', 'Mit Supabase verbunden');
        document.getElementById('einstellung-sync-text').textContent = 'Dieses Gerät ist mit dem gemeinsamen Haushalt verbunden.';
        zugangVerbergen();
        return true;
      } catch (fehler) {
        console.error(fehler);
        if (KONFIG.requireCloudAccess) {
          zugangToken = '';
          localStorage.removeItem(SITZUNGS_SCHLUESSEL);
          statusSetzen('', 'Zugang abgelaufen', 'Bitte erneut anmelden');
          zugangAnzeigen('Der gespeicherte Zugang ist nicht mehr gültig.');
          return false;
        }
        statusSetzen('', 'Verbindung unterbrochen', 'Lokaler Stand wird verwendet');
        toast('Supabase konnte nicht geladen werden. Der lokale Stand bleibt erhalten.');
      }
    }
    try {
      const lokal = localStorage.getItem(LOKALER_SCHLUESSEL);
      if (lokal) zustand = normalisieren(JSON.parse(lokal));
    } catch (fehler) {
      console.error(fehler);
    }
    statusSetzen('', 'Lokaler Prototyp', 'Nur auf diesem Gerät gespeichert');
    return true;
  }

  function speichern() {
    clearTimeout(speicherTimer);
    try { localStorage.setItem(LOKALER_SCHLUESSEL, JSON.stringify(zustand)); } catch (fehler) { console.error(fehler); }
    if (cloudAktiv()) speicherTimer = setTimeout(() => inCloudSpeichern(false), 500);
  }

  async function inCloudSpeichern(ueberschreiben = false) {
    if (!cloudClient || !cloudAktiv()) return;
    statusSetzen('laden', 'Wird gespeichert …', 'Änderungen werden abgeglichen');
    try {
      const { data, error } = await cloudClient.rpc('save_familienbrett_state', {
        p_access_token: zugangToken,
        p_data: zustand,
        p_previous_updated_at: ueberschreiben ? null : (cloudZeitstempel || null)
      });
      if (error) throw error;
      const zeile = Array.isArray(data) ? data[0] : data;
      cloudZeitstempel = zeile?.updated_at || new Date().toISOString();
      statusSetzen('cloud', 'Gemeinsamer Haushalt', 'Alle Änderungen gespeichert');
    } catch (fehler) {
      console.error(fehler);
      const meldung = String(fehler?.message || fehler?.details || '');
      if (meldung.includes('cloud_state_changed')) {
        toast('Auf einem anderen Gerät gab es Änderungen. Die gemeinsame Pinnwand wird neu geladen.');
        await datenLaden();
        allesRendern();
      } else {
        statusSetzen('', 'Noch nicht synchronisiert', 'Verbindung wird später erneut versucht');
        toast('Die Änderung ist lokal gesichert, aber noch nicht in Supabase.');
      }
    }
  }

  function statusSetzen(klasse, titel, text) {
    const karte = document.getElementById('sync-karte');
    if (!karte) return;
    karte.className = `sync-karte ${klasse}`.trim();
    document.getElementById('sync-titel').textContent = titel;
    document.getElementById('sync-text').textContent = text;
  }

  function esc(wert) {
    return String(wert ?? '').replace(/[&<>'"]/g, zeichen => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[zeichen]));
  }

  function mitglied(mitgliedId) {
    return zustand.mitglieder.find(eintrag => eintrag.id === mitgliedId) || { id: '', name: 'Nicht zugeteilt', avatar: '•', farbe: '#b7b7ac' };
  }

  function aufgabenPersonen(aufgabe) {
    if (aufgabe?.ganzeFamilie) return [...zustand.mitglieder];
    const ids = Array.isArray(aufgabe?.personen) ? aufgabe.personen : (aufgabe?.person ? [aufgabe.person] : []);
    return ids.map(mitglied).filter(person => person.id);
  }

  function aufgabenPersonId(aufgabe) {
    return aufgabenPersonen(aufgabe)[0]?.id || zustand.mitglieder[0]?.id || '';
  }

  function projekt(projektId) {
    return zustand.projekte.find(eintrag => eintrag.id === projektId);
  }

  function avatarHtml(person, klasse = '') {
    return `<span class="avatar ${klasse}" style="--avatar-farbe:${esc(person.farbe)}" title="${esc(person.name)}">${esc(person.avatar)}</span>`;
  }

  function deutschesDatum(iso, stil = 'kurz') {
    if (!iso) return 'Ohne Datum';
    const datum = new Date(`${iso}T12:00:00`);
    if (stil === 'tag') return new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(datum);
    if (stil === 'monat') return new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' }).format(datum);
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(datum);
  }

  function faelligText(iso) {
    if (iso === heute()) return 'Heute';
    if (iso === heute(1)) return 'Morgen';
    if (iso < heute()) return `Seit ${deutschesDatum(iso, 'monat')}`;
    return deutschesDatum(iso, 'tag');
  }

  function tageBis(iso) {
    const start = new Date(`${heute()}T12:00:00`);
    const ende = new Date(`${iso}T12:00:00`);
    return Math.round((ende - start) / 86400000);
  }

  function projektFortschritt(eintrag) {
    const etappen = Array.isArray(eintrag.etappen) ? eintrag.etappen : [];
    if (!etappen.length) return 0;
    return Math.round(etappen.filter(etappe => etappe.erledigt).length / etappen.length * 100);
  }

  function projektFertig(eintrag) {
    return Array.isArray(eintrag.etappen) && eintrag.etappen.length > 0 && eintrag.etappen.every(etappe => etappe.erledigt);
  }

  function aktivitaetHinzufuegen(personId, text) {
    zustand.aktivitaeten.unshift({ id: id('ak'), person: personId || zustand.mitglieder[0]?.id, text, zeit: Date.now() });
    zustand.aktivitaeten = zustand.aktivitaeten.slice(0, 30);
  }

  function relativeZeit(zeit) {
    const minuten = Math.max(0, Math.floor((Date.now() - Number(zeit)) / 60000));
    if (minuten < 1) return 'gerade eben';
    if (minuten < 60) return `vor ${minuten} Min.`;
    const stunden = Math.floor(minuten / 60);
    if (stunden < 24) return `vor ${stunden} Std.`;
    const tage = Math.floor(stunden / 24);
    return tage === 1 ? 'gestern' : `vor ${tage} Tagen`;
  }

  function iconsAktualisieren() {
    if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
  }

  function datumRendern() {
    const datum = new Date(`${ausgewaehltesDatum}T12:00:00`);
    document.getElementById('datum-zeile').textContent = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(datum);
    document.getElementById('kalender-tag').textContent = String(datum.getDate()).padStart(2, '0');
    document.getElementById('kalender-wochentag').textContent = new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(datum);
  }

  function mitgliederRendern() {
    document.getElementById('haushalt-name').textContent = zustand.haushalt.name;
    const familiennameEingabe = document.getElementById('familienname-eingabe');
    if (familiennameEingabe && document.activeElement !== familiennameEingabe) familiennameEingabe.value = zustand.haushalt.name;

    const liste = document.getElementById('mitglieder-verwalten');
    liste.innerHTML = zustand.mitglieder.map(person => `
      <div class="mitglied-zeile">
        ${avatarHtml(person)}<strong>${esc(person.name)}</strong>
        <button type="button" data-mitglied-loeschen="${esc(person.id)}" aria-label="${esc(person.name)} entfernen"><i data-lucide="trash-2"></i></button>
      </div>`).join('');

    const optionen = zustand.mitglieder.map(person => `<option value="${esc(person.id)}">${esc(person.name)}</option>`).join('');
    ['projekt-person'].forEach(elementId => {
      const element = document.getElementById(elementId);
      const auswahl = element.value;
      element.innerHTML = optionen;
      if ([...element.options].some(option => option.value === auswahl)) element.value = auswahl;
    });

    const personFilter = document.getElementById('filter-person');
    const filterWert = personFilter.value || 'alle';
    personFilter.innerHTML = `<option value="alle">Alle Personen</option>${optionen}`;
    personFilter.value = [...personFilter.options].some(option => option.value === filterWert) ? filterWert : 'alle';

    document.getElementById('aufgabe-personen').innerHTML = zustand.mitglieder.map(person => `
      <label><input type="checkbox" name="aufgabe-person" value="${esc(person.id)}"><span>${avatarHtml(person, 'klein')}<strong>${esc(person.name)}</strong></span></label>`).join('');

    document.getElementById('projekt-mitglieder').innerHTML = zustand.mitglieder.map(person => `
      <label><input type="checkbox" name="projekt-mitglied" value="${esc(person.id)}"><span>${esc(person.avatar)} ${esc(person.name)}</span></label>`).join('');
  }

  function zettelHtml(aufgabe) {
    const personen = aufgabenPersonen(aufgabe);
    const namensText = aufgabe.ganzeFamilie ? 'Ganze Familie' : personen.map(person => person.name).join(', ');
    const form = String(aufgabe.id).split('').reduce((summe, zeichen) => summe + zeichen.charCodeAt(0), 0) % 3;
    return `
      <article class="notizzettel zettel-form-${form} prio-${esc(aufgabe.prioritaet)} ${aufgabe.erledigt ? 'erledigt' : ''}" style="--zettel:${ZETTELFARBEN[aufgabe.farbe] || ZETTELFARBEN.gelb}">
        <span class="pin" aria-hidden="true"></span>
        <button class="notiz-bearbeiten" type="button" data-aufgabe-bearbeiten="${esc(aufgabe.id)}" aria-label="${esc(aufgabe.titel)} bearbeiten"><i data-lucide="pencil"></i></button>
        <div class="notiz-schild"><span>${esc(aufgabe.bereich)}</span><time datetime="${esc(aufgabe.faellig)}">${esc(deutschesDatum(aufgabe.faellig, 'monat'))}</time></div>
        <h3>${esc(aufgabe.titel)}</h3>
        ${aufgabe.beschreibung ? `<p>${esc(aufgabe.beschreibung)}</p>` : ''}
        <div class="notiz-fuss">
          <span class="notiz-person"><span class="avatar-stapel">${personen.slice(0, 3).map(person => avatarHtml(person, 'klein')).join('')}</span><span>${esc(namensText || 'Nicht zugeteilt')}</span></span>
        </div>
        <button class="notiz-haken" type="button" data-aufgabe-erledigen="${esc(aufgabe.id)}" aria-label="${aufgabe.erledigt ? 'Aufgabe wieder öffnen' : 'Aufgabe erledigen'}"><i data-lucide="${aufgabe.erledigt ? 'undo-2' : 'check'}"></i></button>
      </article>`;
  }

  function projektKarteHtml(eintrag, gross = false) {
    const fortschritt = projektFortschritt(eintrag);
    const personen = (eintrag.mitglieder || []).map(mitglied);
    const etappenListe = Array.isArray(eintrag.etappen) ? eintrag.etappen : [];
    if (!gross) return `
      <article class="projekt-karte" style="--projekt-papier:${PROJEKTFARBEN[eintrag.farbe] || PROJEKTFARBEN.creme}">
        <button class="projekt-bearbeiten" type="button" data-projekt-bearbeiten="${esc(eintrag.id)}" aria-label="${esc(eintrag.titel)} bearbeiten"><i data-lucide="pencil"></i></button>
        <span class="ueberzeile">Projekt</span><h3>${esc(eintrag.titel)}</h3><p>${esc(eintrag.beschreibung)}</p>
        <div class="projekt-meta"><span><i data-lucide="calendar"></i>${esc(deutschesDatum(eintrag.faellig, 'monat'))}</span><span>${etappenListe.filter(e => e.erledigt).length}/${etappenListe.length} Etappen</span></div>
        <div class="fortschritt-balken" style="--prozent:${fortschritt}%"><span></span></div>
        <div class="projekt-unten"><span class="avatar-stapel">${personen.slice(0, 3).map(p => avatarHtml(p, 'sehr-klein')).join('')}</span><strong class="projekt-prozent">${fortschritt}%</strong></div>
      </article>`;

    const etappen = etappenListe.map(etappe => `
      <button class="etappe ${etappe.erledigt ? 'erledigt' : ''}" type="button" data-etappe="${esc(etappe.id)}" data-projekt="${esc(eintrag.id)}">
        <span class="etappe-box">${etappe.erledigt ? '✓' : ''}</span><span>${esc(etappe.titel)}</span>
      </button>`).join('');
    const zugeordneteAufgaben = zustand.aufgaben.filter(aufgabe => aufgabe.projektId === eintrag.id && !aufgabe.erledigt).length;
    const erledigteEtappen = etappenListe.filter(etappe => etappe.erledigt).length;
    return `
      <article class="projekt-gross" style="--projekt-papier:${PROJEKTFARBEN[eintrag.farbe] || PROJEKTFARBEN.creme}">
        <button class="projekt-bearbeiten" type="button" data-projekt-bearbeiten="${esc(eintrag.id)}" aria-label="${esc(eintrag.titel)} bearbeiten"><i data-lucide="pencil"></i></button>
        <span class="projekt-status ${projektFertig(eintrag) ? 'fertig' : ''}">${projektFertig(eintrag) ? 'Abgeschlossen' : 'In Arbeit'}</span>
        <h3>${esc(eintrag.titel)}</h3><p>${esc(eintrag.beschreibung)}</p>
        <details class="projekt-etappen-details">
          <summary>Etappen ${erledigteEtappen}/${etappenListe.length}<i data-lucide="chevron-down"></i></summary>
          <div class="etappen">${etappen || '<span class="notiz-bereich">Noch keine Etappen</span>'}</div>
        </details>
        <div class="projekt-detail-fuss">
          <div class="projekt-detail-zeile"><span>Fortschritt</span><strong>${fortschritt}%</strong></div>
          <div class="fortschritt-balken" style="--prozent:${fortschritt}%"><span></span></div>
          <div class="projekt-detail-zeile"><span>${avatarHtml(mitglied(eintrag.verantwortlich), 'sehr-klein')} Ziel: ${esc(deutschesDatum(eintrag.faellig, 'monat'))}</span><span>${zugeordneteAufgaben} offene Aufgaben</span></div>
        </div>
      </article>`;
  }

  function uebersichtRendern() {
    const rang = { hoch: 0, normal: 1, niedrig: 2 };
    const tagesaufgaben = zustand.aufgaben
      .filter(aufgabe => aufgabe.faellig === ausgewaehltesDatum)
      .sort((a, b) => Number(a.erledigt) - Number(b.erledigt) || (rang[a.prioritaet] ?? 1) - (rang[b.prioritaet] ?? 1) || a.erstelltAm - b.erstelltAm);
    document.getElementById('heute-aufgaben').innerHTML = tagesaufgaben.length
      ? tagesaufgaben.slice(0, 8).map(zettelHtml).join('')
      : `<div class="leerer-zettel"><p>Für diesen Tag ist noch nichts notiert.</p><button type="button" data-action="aufgabe-neu">Aufgabe notieren</button></div>`;

    document.getElementById('kalender-aufgaben').innerHTML = tagesaufgaben.length
      ? tagesaufgaben.slice(0, 5).map(aufgabe => `
          <div class="kalender-eintrag ${aufgabe.erledigt ? 'erledigt' : ''}">
            <button class="kalender-text" type="button" data-aufgabe-bearbeiten="${esc(aufgabe.id)}">
              <span>${esc(aufgabe.bereich)}</span><strong>${esc(aufgabe.titel)}</strong>
            </button>
            <button class="kalender-haken" type="button" data-aufgabe-erledigen="${esc(aufgabe.id)}" aria-label="${aufgabe.erledigt ? 'Aufgabe wieder öffnen' : 'Aufgabe erledigen'}">${aufgabe.erledigt ? '✓' : ''}</button>
          </div>`).join('')
      : '<p class="kalender-leer">Noch nichts eingetragen.</p>';
  }

  function aufgabenRendern() {
    let aufgaben = [...zustand.aufgaben];
    if (filter.status === 'offen') aufgaben = aufgaben.filter(a => !a.erledigt);
    if (filter.status === 'erledigt') aufgaben = aufgaben.filter(a => a.erledigt);
    if (filter.person !== 'alle') aufgaben = aufgaben.filter(a => a.ganzeFamilie || aufgabenPersonen(a).some(person => person.id === filter.person));
    if (filter.bereich !== 'alle') aufgaben = aufgaben.filter(a => a.bereich === filter.bereich);
    if (filter.suche) {
      const suchtext = filter.suche.toLocaleLowerCase('de');
      aufgaben = aufgaben.filter(a => [a.titel, a.beschreibung, a.bereich, ...aufgabenPersonen(a).map(person => person.name), projekt(a.projektId)?.titel].some(wert => String(wert || '').toLocaleLowerCase('de').includes(suchtext)));
    }
    aufgaben.sort((a, b) => Number(a.erledigt) - Number(b.erledigt) || a.faellig.localeCompare(b.faellig) || Number(b.prioritaet === 'hoch') - Number(a.prioritaet === 'hoch'));

    const gruppen = [
      { titel: 'Überfällig', offen: true, test: a => !a.erledigt && a.faellig < heute() },
      { titel: 'Heute', offen: true, test: a => !a.erledigt && a.faellig === heute() },
      { titel: 'Als Nächstes', offen: false, test: a => !a.erledigt && a.faellig > heute() && tageBis(a.faellig) <= 7 },
      { titel: 'Später', offen: false, test: a => !a.erledigt && tageBis(a.faellig) > 7 },
      { titel: 'Erledigt', offen: false, test: a => a.erledigt }
    ];
    const html = gruppen.map(gruppe => {
      const eintraege = aufgaben.filter(gruppe.test);
      if (!eintraege.length) return '';
      return `<details class="aufgaben-gruppe" ${gruppe.offen ? 'open' : ''}><summary>${gruppe.titel}<span>${eintraege.length}</span><i data-lucide="chevron-down" class="aufklapp-pfeil"></i></summary><div class="aufgaben-raster">${eintraege.map(zettelHtml).join('')}</div></details>`;
    }).join('');
    document.getElementById('aufgaben-gruppen').innerHTML = html || `<div class="leer-projekte"><div><i data-lucide="search-x"></i><p>Für diese Auswahl wurden keine Aufgaben gefunden.</p></div></div>`;
    document.getElementById('aufgaben-treffer').textContent = `${aufgaben.length} ${aufgaben.length === 1 ? 'Aufgabe' : 'Aufgaben'}`;
    document.getElementById('filter-status').value = filter.status;
    document.getElementById('filter-person').value = filter.person;
    document.getElementById('filter-bereich').value = filter.bereich;
  }

  function projekteRendern() {
    let projekte = [...zustand.projekte];
    if (projektFilter === 'aktiv') projekte = projekte.filter(p => !projektFertig(p));
    if (projektFilter === 'fertig') projekte = projekte.filter(projektFertig);
    if (filter.suche) {
      const suchtext = filter.suche.toLocaleLowerCase('de');
      projekte = projekte.filter(p => [p.titel, p.beschreibung, ...(p.etappen || []).map(e => e.titel)].some(wert => String(wert || '').toLocaleLowerCase('de').includes(suchtext)));
    }
    projekte.sort((a, b) => a.faellig.localeCompare(b.faellig));
    document.getElementById('projekte-wand').innerHTML = projekte.length ? projekte.map(p => projektKarteHtml(p, true)).join('') : `<div class="leer-projekte"><div><i data-lucide="folder-open"></i><p>Hier ist noch Platz für euer nächstes gemeinsames Projekt.</p><button class="sekundaer-knopf" type="button" data-action="projekt-neu">Projekt anlegen</button></div></div>`;
  }

  function auswahlRendern() {
    const bereiche = [...new Set([...(zustand.bereiche || []), ...zustand.aufgaben.map(a => a.bereich).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'de'));
    const bereichSelect = document.getElementById('filter-bereich');
    bereichSelect.innerHTML = `<option value="alle">Alle Bereiche</option>${bereiche.map(b => `<option>${esc(b)}</option>`).join('')}`;
    bereichSelect.value = filter.bereich;

    const aufgabeBereich = document.getElementById('aufgabe-bereich');
    const aktuellerBereich = aufgabeBereich.value;
    aufgabeBereich.innerHTML = bereiche.map(b => `<option>${esc(b)}</option>`).join('');
    if (bereiche.includes(aktuellerBereich)) aufgabeBereich.value = aktuellerBereich;

    const projektSelect = document.getElementById('aufgabe-projekt');
    const wert = projektSelect.value;
    projektSelect.innerHTML = `<option value="">Keinem Projekt zuordnen</option>${zustand.projekte.filter(p => !projektFertig(p)).map(p => `<option value="${esc(p.id)}">${esc(p.titel)}</option>`).join('')}`;
    if ([...projektSelect.options].some(option => option.value === wert)) projektSelect.value = wert;
  }

  function bereichHinzufuegen() {
    const input = document.getElementById('bereich-neu-name');
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    const vorhanden = (zustand.bereiche || []).find(bereich => bereich.toLocaleLowerCase('de') === name.toLocaleLowerCase('de'));
    if (vorhanden) {
      document.getElementById('aufgabe-bereich').value = vorhanden;
      toast('Diesen Bereich gibt es bereits');
      return;
    }
    zustand.bereiche = [...(zustand.bereiche || []), name];
    auswahlRendern();
    document.getElementById('aufgabe-bereich').value = name;
    input.value = '';
    document.getElementById('bereich-neu-zeile').hidden = true;
    speichern();
    toast(`Bereich „${name}“ angelegt`);
  }

  function zaehlerRendern() {
    const offeneAufgaben = zustand.aufgaben.filter(a => !a.erledigt).length;
    const aktiveProjekte = zustand.projekte.filter(p => !projektFertig(p)).length;
    document.getElementById('nav-aufgaben-zaehler').textContent = offeneAufgaben;
    document.getElementById('nav-projekte-zaehler').textContent = aktiveProjekte;
    document.getElementById('projekte-kurzinfo').textContent = `${aktiveProjekte} ${aktiveProjekte === 1 ? 'aktives Projekt' : 'aktive Projekte'}`;
  }

  function allesRendern() {
    datumRendern();
    mitgliederRendern();
    auswahlRendern();
    uebersichtRendern();
    aufgabenRendern();
    projekteRendern();
    zaehlerRendern();
    iconsAktualisieren();
  }

  function ansichtWechseln(name) {
    if (!['uebersicht', 'aufgaben', 'projekte'].includes(name)) return;
    aktiveAnsicht = name;
    document.body.dataset.ansicht = name;
    document.querySelectorAll('[data-view-panel]').forEach(panel => panel.classList.toggle('aktiv', panel.dataset.viewPanel === name));
    document.querySelectorAll('[data-view]').forEach(knopf => {
      const aktiv = knopf.dataset.view === name;
      knopf.classList.toggle('aktiv', aktiv);
      if (knopf.classList.contains('nav-eintrag')) aktiv ? knopf.setAttribute('aria-current', 'page') : knopf.removeAttribute('aria-current');
    });
    document.getElementById('seiten-titel').textContent = 'Mach Ma!';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    iconsAktualisieren();
  }

  function dialogOeffnen(element) {
    if (typeof element.showModal === 'function') element.showModal();
  }

  function aufgabeOeffnen(aufgabeId = '') {
    const eintrag = zustand.aufgaben.find(a => a.id === aufgabeId);
    const form = document.getElementById('aufgabe-form');
    form.reset();
    document.getElementById('aufgabe-id').value = eintrag?.id || '';
    document.getElementById('aufgabe-dialog-titel').textContent = eintrag ? 'Aufgabe bearbeiten' : 'Neue Aufgabe';
    document.getElementById('aufgabe-titel').value = eintrag?.titel || '';
    document.getElementById('aufgabe-beschreibung').value = eintrag?.beschreibung || '';
    document.getElementById('aufgabe-bereich').value = eintrag?.bereich || 'Küche';
    document.getElementById('aufgabe-faellig').value = eintrag?.faellig || ausgewaehltesDatum;
    document.getElementById('aufgabe-prioritaet').value = eintrag?.prioritaet || 'normal';
    document.getElementById('aufgabe-projekt').value = eintrag?.projektId || '';
    const farbe = eintrag?.farbe || 'gelb';
    const farbwahl = form.querySelector(`input[name="farbe"][value="${farbe}"]`);
    if (farbwahl) farbwahl.checked = true;
    const ganzeFamilie = Boolean(eintrag?.ganzeFamilie);
    document.getElementById('aufgabe-alle').checked = ganzeFamilie;
    const ausgewaehltePersonen = eintrag ? aufgabenPersonen(eintrag).map(person => person.id) : [zustand.mitglieder[0]?.id];
    form.querySelectorAll('input[name="aufgabe-person"]').forEach(input => {
      input.checked = !ganzeFamilie && ausgewaehltePersonen.includes(input.value);
      input.disabled = ganzeFamilie;
    });
    form.querySelector('.formular-mehr').open = Boolean(eintrag && (eintrag.beschreibung || eintrag.prioritaet !== 'normal' || eintrag.projektId));
    document.getElementById('bereich-neu-zeile').hidden = true;
    document.getElementById('aufgabe-loeschen').style.visibility = eintrag ? 'visible' : 'hidden';
    dialogOeffnen(document.getElementById('aufgabe-dialog'));
    setTimeout(() => document.getElementById('aufgabe-titel').focus(), 50);
  }

  function aufgabeSpeichern(event) {
    event.preventDefault();
    const formular = event.currentTarget;
    if (!formular.reportValidity()) return;
    const aufgabeId = document.getElementById('aufgabe-id').value;
    const vorhanden = zustand.aufgaben.find(a => a.id === aufgabeId);
    const ganzeFamilie = document.getElementById('aufgabe-alle').checked;
    const personen = [...formular.querySelectorAll('input[name="aufgabe-person"]:checked')].map(input => input.value);
    if (!ganzeFamilie && !personen.length) {
      toast('Wähle mindestens eine Person oder die ganze Familie');
      return;
    }
    const daten = {
      titel: document.getElementById('aufgabe-titel').value.trim(),
      beschreibung: document.getElementById('aufgabe-beschreibung').value.trim(),
      personen,
      ganzeFamilie,
      bereich: document.getElementById('aufgabe-bereich').value,
      faellig: document.getElementById('aufgabe-faellig').value,
      prioritaet: document.getElementById('aufgabe-prioritaet').value,
      projektId: document.getElementById('aufgabe-projekt').value,
      farbe: formular.querySelector('input[name="farbe"]:checked')?.value || 'gelb'
    };
    if (vorhanden) {
      Object.assign(vorhanden, daten);
      delete vorhanden.person;
      aktivitaetHinzufuegen(personen[0] || zustand.mitglieder[0]?.id, `hat „${daten.titel}“ bearbeitet`);
      toast('Aufgabe aktualisiert');
    } else {
      zustand.aufgaben.push({ id: id('a'), ...daten, erledigt: false, erstelltAm: Date.now() });
      aktivitaetHinzufuegen(personen[0] || zustand.mitglieder[0]?.id, `hat „${daten.titel}“ angelegt`);
      toast('Aufgabe an die Pinnwand geheftet');
    }
    document.getElementById('aufgabe-dialog').close();
    speichern();
    allesRendern();
  }

  function aufgabeErledigen(aufgabeId) {
    const aufgabe = zustand.aufgaben.find(a => a.id === aufgabeId);
    if (!aufgabe) return;
    aufgabe.erledigt = !aufgabe.erledigt;
    if (aufgabe.erledigt) {
      aufgabe.erledigtAm = Date.now();
      aktivitaetHinzufuegen(aufgabenPersonId(aufgabe), `hat „${aufgabe.titel}“ erledigt`);
      toast('Geschafft – Aufgabe abgehakt');
    } else {
      delete aufgabe.erledigtAm;
      aktivitaetHinzufuegen(aufgabenPersonId(aufgabe), `hat „${aufgabe.titel}“ wieder geöffnet`);
      toast('Aufgabe wieder geöffnet');
    }
    speichern();
    allesRendern();
  }

  function aufgabeLoeschen() {
    const aufgabeId = document.getElementById('aufgabe-id').value;
    const aufgabe = zustand.aufgaben.find(a => a.id === aufgabeId);
    if (!aufgabe || !window.confirm(`„${aufgabe.titel}“ wirklich löschen?`)) return;
    zustand.aufgaben = zustand.aufgaben.filter(a => a.id !== aufgabeId);
    aktivitaetHinzufuegen(aufgabenPersonId(aufgabe), `hat die Aufgabe „${aufgabe.titel}“ entfernt`);
    document.getElementById('aufgabe-dialog').close();
    speichern();
    allesRendern();
    toast('Aufgabe gelöscht');
  }

  function projektOeffnen(projektId = '') {
    const eintrag = zustand.projekte.find(p => p.id === projektId);
    const form = document.getElementById('projekt-form');
    form.reset();
    document.getElementById('projekt-id').value = eintrag?.id || '';
    document.getElementById('projekt-dialog-titel').textContent = eintrag ? 'Projekt bearbeiten' : 'Neues Projekt';
    document.getElementById('projekt-titel').value = eintrag?.titel || '';
    document.getElementById('projekt-beschreibung').value = eintrag?.beschreibung || '';
    document.getElementById('projekt-faellig').value = eintrag?.faellig || heute(14);
    document.getElementById('projekt-person').value = eintrag?.verantwortlich || zustand.mitglieder[0]?.id || '';
    document.getElementById('projekt-etappen').value = (eintrag?.etappen || []).map(etappe => etappe.titel).join('\n');
    document.querySelectorAll('input[name="projekt-mitglied"]').forEach(input => { input.checked = eintrag ? (eintrag.mitglieder || []).includes(input.value) : input.value === zustand.mitglieder[0]?.id; });
    const farbe = eintrag?.farbe || 'creme';
    const farbwahl = form.querySelector(`input[name="projekt-farbe"][value="${farbe}"]`);
    if (farbwahl) farbwahl.checked = true;
    form.querySelector('.formular-mehr').open = Boolean(eintrag);
    document.getElementById('projekt-loeschen').style.visibility = eintrag ? 'visible' : 'hidden';
    dialogOeffnen(document.getElementById('projekt-dialog'));
    setTimeout(() => document.getElementById('projekt-titel').focus(), 50);
  }

  function projektSpeichern(event) {
    event.preventDefault();
    const formular = event.currentTarget;
    if (!formular.reportValidity()) return;
    const projektId = document.getElementById('projekt-id').value;
    const vorhanden = zustand.projekte.find(p => p.id === projektId);
    const etappenTexte = document.getElementById('projekt-etappen').value.split('\n').map(w => w.trim()).filter(Boolean);
    const etappen = etappenTexte.map(titel => {
      const alt = vorhanden?.etappen?.find(e => e.titel.toLocaleLowerCase('de') === titel.toLocaleLowerCase('de'));
      return alt ? { ...alt, titel } : { id: id('e'), titel, erledigt: false };
    });
    const mitglieder = [...formular.querySelectorAll('input[name="projekt-mitglied"]:checked')].map(input => input.value);
    const verantwortlich = document.getElementById('projekt-person').value;
    if (!mitglieder.includes(verantwortlich)) mitglieder.push(verantwortlich);
    const daten = {
      titel: document.getElementById('projekt-titel').value.trim(),
      beschreibung: document.getElementById('projekt-beschreibung').value.trim(),
      faellig: document.getElementById('projekt-faellig').value,
      verantwortlich,
      mitglieder,
      etappen,
      farbe: formular.querySelector('input[name="projekt-farbe"]:checked')?.value || 'creme'
    };
    if (vorhanden) {
      Object.assign(vorhanden, daten);
      aktivitaetHinzufuegen(verantwortlich, `hat „${daten.titel}“ bearbeitet`);
      toast('Projekt aktualisiert');
    } else {
      zustand.projekte.push({ id: id('p'), ...daten, erstelltAm: Date.now() });
      aktivitaetHinzufuegen(verantwortlich, `hat das Projekt „${daten.titel}“ gestartet`);
      toast('Projekt an die Pinnwand geheftet');
    }
    document.getElementById('projekt-dialog').close();
    speichern();
    allesRendern();
  }

  function projektLoeschen() {
    const projektId = document.getElementById('projekt-id').value;
    const eintrag = zustand.projekte.find(p => p.id === projektId);
    if (!eintrag || !window.confirm(`Projekt „${eintrag.titel}“ wirklich löschen? Zugeordnete Aufgaben bleiben erhalten.`)) return;
    zustand.projekte = zustand.projekte.filter(p => p.id !== projektId);
    zustand.aufgaben.forEach(aufgabe => { if (aufgabe.projektId === projektId) aufgabe.projektId = ''; });
    aktivitaetHinzufuegen(eintrag.verantwortlich, `hat das Projekt „${eintrag.titel}“ entfernt`);
    document.getElementById('projekt-dialog').close();
    speichern();
    allesRendern();
    toast('Projekt gelöscht');
  }

  function etappeUmschalten(projektId, etappeId) {
    const eintrag = zustand.projekte.find(p => p.id === projektId);
    const etappe = eintrag?.etappen?.find(e => e.id === etappeId);
    if (!eintrag || !etappe) return;
    etappe.erledigt = !etappe.erledigt;
    aktivitaetHinzufuegen(eintrag.verantwortlich, `hat die Etappe „${etappe.titel}“ ${etappe.erledigt ? 'abgehakt' : 'wieder geöffnet'}`);
    speichern();
    allesRendern();
    toast(etappe.erledigt ? 'Etappe geschafft' : 'Etappe wieder geöffnet');
  }

  function mitgliedHinzufuegen() {
    const input = document.getElementById('mitglied-name');
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    if (zustand.mitglieder.some(p => p.name.toLocaleLowerCase('de') === name.toLocaleLowerCase('de'))) {
      toast('Dieser Name ist bereits vorhanden');
      return;
    }
    const person = { id: id('m'), name, avatar: document.getElementById('mitglied-avatar').value, farbe: FARBEN[zustand.mitglieder.length % FARBEN.length] };
    zustand.mitglieder.push(person);
    aktivitaetHinzufuegen(person.id, 'ist zum Familienbrett hinzugekommen');
    input.value = '';
    speichern();
    allesRendern();
    toast(`${name} wurde hinzugefügt`);
  }

  function familiennameSpeichern() {
    const input = document.getElementById('familienname-eingabe');
    const name = input.value.trim();
    if (name.length < 2) {
      toast('Bitte einen Familiennamen eingeben');
      input.focus();
      return;
    }
    zustand.haushalt.name = name;
    speichern();
    allesRendern();
    toast(`Willkommen bei ${name}`);
  }

  function mitgliedLoeschen(mitgliedId) {
    const person = mitglied(mitgliedId);
    const verwendet = zustand.aufgaben.some(a => a.ganzeFamilie || aufgabenPersonen(a).some(person => person.id === mitgliedId)) || zustand.projekte.some(p => p.verantwortlich === mitgliedId || (p.mitglieder || []).includes(mitgliedId));
    if (verwendet) {
      toast(`${person.name} ist noch Aufgaben oder Projekten zugeordnet`);
      return;
    }
    if (zustand.mitglieder.length <= 1) { toast('Mindestens eine Person muss im Haushalt bleiben'); return; }
    if (!window.confirm(`${person.name} aus dem Haushalt entfernen?`)) return;
    zustand.mitglieder = zustand.mitglieder.filter(p => p.id !== mitgliedId);
    speichern();
    allesRendern();
  }

  function toast(text) {
    const element = document.getElementById('toast');
    element.textContent = text;
    element.classList.add('sichtbar');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('sichtbar'), 3200);
  }

  function aktionAusfuehren(aktion) {
    if (aktion === 'aufgabe-neu') aufgabeOeffnen();
    if (aktion === 'projekt-neu') projektOeffnen();
    if (aktion === 'mitglieder-oeffnen') dialogOeffnen(document.getElementById('mitglieder-dialog'));
    if (aktion === 'info-oeffnen') dialogOeffnen(document.getElementById('info-dialog'));
    if (aktion === 'abmelden') {
      zugangToken = '';
      localStorage.removeItem(SITZUNGS_SCHLUESSEL);
      document.getElementById('info-dialog').close();
      zugangAnzeigen('Der Zugang wurde auf diesem Gerät vergessen.');
    }
    if (aktion === 'bereich-neu-zeigen') {
      const zeile = document.getElementById('bereich-neu-zeile');
      zeile.hidden = !zeile.hidden;
      if (!zeile.hidden) setTimeout(() => document.getElementById('bereich-neu-name').focus(), 30);
    }
  }

  function ereignisseBinden() {
    document.addEventListener('click', event => {
      const viewKnopf = event.target.closest('[data-view]');
      if (viewKnopf) ansichtWechseln(viewKnopf.dataset.view);
      const aktionsKnopf = event.target.closest('[data-action]');
      if (aktionsKnopf) aktionAusfuehren(aktionsKnopf.dataset.action);
      const dialogSchliessen = event.target.closest('[data-dialog-schliessen]');
      if (dialogSchliessen) dialogSchliessen.closest('dialog')?.close();
      const aufgabeBearbeiten = event.target.closest('[data-aufgabe-bearbeiten]');
      if (aufgabeBearbeiten) aufgabeOeffnen(aufgabeBearbeiten.dataset.aufgabeBearbeiten);
      const aufgabeErledigt = event.target.closest('[data-aufgabe-erledigen]');
      if (aufgabeErledigt) aufgabeErledigen(aufgabeErledigt.dataset.aufgabeErledigen);
      const projektBearbeiten = event.target.closest('[data-projekt-bearbeiten]');
      if (projektBearbeiten) projektOeffnen(projektBearbeiten.dataset.projektBearbeiten);
      const etappe = event.target.closest('[data-etappe]');
      if (etappe) etappeUmschalten(etappe.dataset.projekt, etappe.dataset.etappe);
      const mitgliedEntfernen = event.target.closest('[data-mitglied-loeschen]');
      if (mitgliedEntfernen) mitgliedLoeschen(mitgliedEntfernen.dataset.mitgliedLoeschen);
      const projektFilterKnopf = event.target.closest('[data-projekt-filter]');
      if (projektFilterKnopf) {
        projektFilter = projektFilterKnopf.dataset.projektFilter;
        document.querySelectorAll('[data-projekt-filter]').forEach(k => k.classList.toggle('aktiv', k === projektFilterKnopf));
        projekteRendern(); iconsAktualisieren();
      }
      const tagWechsel = event.target.closest('[data-tag-wechsel]');
      if (tagWechsel) {
        const datum = new Date(`${ausgewaehltesDatum}T12:00:00`);
        datum.setDate(datum.getDate() + Number(tagWechsel.dataset.tagWechsel));
        ausgewaehltesDatum = datum.toISOString().slice(0, 10);
        datumRendern(); uebersichtRendern(); iconsAktualisieren();
      }
      if (event.target.closest('[data-tag-heute]')) {
        ausgewaehltesDatum = heute();
        datumRendern(); uebersichtRendern(); iconsAktualisieren();
      }
    });

    document.getElementById('aufgabe-form').addEventListener('submit', aufgabeSpeichern);
    document.getElementById('zugang-form').addEventListener('submit', zugangPruefen);
    document.getElementById('projekt-form').addEventListener('submit', projektSpeichern);
    document.getElementById('aufgabe-loeschen').addEventListener('click', aufgabeLoeschen);
    document.getElementById('projekt-loeschen').addEventListener('click', projektLoeschen);
    document.getElementById('mitglied-hinzufuegen').addEventListener('click', mitgliedHinzufuegen);
    document.getElementById('familienname-speichern').addEventListener('click', familiennameSpeichern);
    document.getElementById('bereich-hinzufuegen').addEventListener('click', bereichHinzufuegen);
    document.getElementById('bereich-neu-name').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); bereichHinzufuegen(); } });
    document.getElementById('mitglied-name').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); mitgliedHinzufuegen(); } });
    document.getElementById('familienname-eingabe').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); familiennameSpeichern(); } });
    document.getElementById('aufgabe-alle').addEventListener('change', event => {
      document.querySelectorAll('input[name="aufgabe-person"]').forEach(input => { input.disabled = event.target.checked; if (event.target.checked) input.checked = false; });
    });
    document.getElementById('aufgabe-personen').addEventListener('change', () => {
      if (document.querySelector('input[name="aufgabe-person"]:checked')) document.getElementById('aufgabe-alle').checked = false;
    });

    document.getElementById('filter-status').addEventListener('change', event => { filter.status = event.target.value; aufgabenRendern(); iconsAktualisieren(); });
    document.getElementById('filter-person').addEventListener('change', event => { filter.person = event.target.value; aufgabenRendern(); iconsAktualisieren(); });
    document.getElementById('filter-bereich').addEventListener('change', event => { filter.bereich = event.target.value; aufgabenRendern(); iconsAktualisieren(); });
    document.getElementById('filter-reset').addEventListener('click', () => {
      Object.assign(filter, { status: 'offen', person: 'alle', bereich: 'alle', suche: '' });
      aufgabenRendern(); iconsAktualisieren();
    });
    document.querySelectorAll('dialog').forEach(dialog => {
      dialog.addEventListener('click', event => {
        const rechteck = dialog.getBoundingClientRect();
        const ausserhalb = event.clientX < rechteck.left || event.clientX > rechteck.right || event.clientY < rechteck.top || event.clientY > rechteck.bottom;
        if (ausserhalb) dialog.close();
      });
    });
  }

  async function starten() {
    datumRendern();
    ereignisseBinden();
    sitzungLaden();
    await datenLaden();
    allesRendern();
    ansichtWechseln('uebersicht');
  }

  document.addEventListener('DOMContentLoaded', starten);
})();
