import { create } from 'zustand'

// Polish / English. The app is written in English; Polish text is swapped in on
// the page by a small observer, so every screen (and every new string) only
// needs one entry here. Unknown text stays English.

export type Lang = 'pl' | 'en'

const KEY = 'kilo.lang'
const read = (): Lang => {
  try {
    return localStorage.getItem(KEY) === 'en' ? 'en' : 'pl'
  } catch {
    return 'pl'
  }
}

export const useLang = create<{ lang: Lang }>(() => ({ lang: read() }))
export const lang = () => useLang.getState().lang

export function setLang(l: Lang) {
  try {
    localStorage.setItem(KEY, l)
  } catch {
    /* private mode: the choice lasts until reload */
  }
  useLang.setState({ lang: l })
  document.documentElement.lang = l
  translateTree(document.body)
}

const PL: Record<string, string> = {
  // tabs, headers
  Weight: 'Waga',
  Gym: 'Siłownia',
  Settings: 'Ustawienia',
  Sections: 'Sekcje',
  Today: 'Dziś',
  'Day 1': 'Dzień 1',
  'Day 1 photo': 'Zdjęcie z dnia 1',
  'Next photo': 'Następne zdjęcie',
  'See yourself change.': 'Zobacz, jak się zmieniasz.',
  // welcome / login
  'Continue with Google': 'Kontynuuj z Google',
  'Continue with email': 'Kontynuuj z e-mailem',
  'Continue without account': 'Kontynuuj bez konta',
  'Your email': 'Twój e-mail',
  Email: 'E-mail',
  Password: 'Hasło',
  Continue: 'Dalej',
  'New here? This creates your account.': 'Pierwszy raz? To utworzy Twoje konto.',
  'Enter a valid email.': 'Wpisz poprawny e-mail.',
  'Use at least 6 characters.': 'Użyj co najmniej 6 znaków.',
  'Wrong password.': 'Złe hasło.',
  'Your data stays on this phone. No cloud, no sign-up.': 'Dane zostają na tym telefonie. Bez chmury i rejestracji.',
  'Google sign-in needs a Google client ID. Add it in Settings → Account, or continue without an account.':
    'Logowanie Google wymaga Google client ID. Dodaj je w Ustawieniach → Konto albo kontynuuj bez konta.',
  // onboarding
  "What's your goal?": 'Jaki jest Twój cel?',
  'Your weight today': 'Twoja waga dziś',
  'Your goal weight': 'Twoja waga docelowa',
  Skip: 'Pomiń',
  'Lose fat': 'Schudnąć',
  'Build muscle': 'Zbudować mięśnie',
  'Stay the same': 'Bez zmian',
  Unit: 'Jednostka',
  'Day 1. Here we go.': 'Dzień 1. Ruszamy.',
  // weight tab
  All: 'Wszystko',
  'On track': 'Na dobrej drodze',
  'Trending up': 'Trend w górę',
  'Trending down': 'Trend w dół',
  Steady: 'Stabilnie',
  Drifting: 'Dryfujesz',
  'Finding your trend': 'Szukam Twojego trendu',
  'Holding steady': 'Trzymasz stabilnie',
  'Edit day': 'Edytuj dzień',
  'Chart range': 'Zakres wykresu',
  Done: 'Gotowe',
  Logged: 'Zapisano',
  Saved: 'Zapisane',
  'That number looks off.': 'Ta liczba wygląda źle.',
  'Photo saved': 'Zdjęcie zapisane',
  'Day 1 photo saved': 'Zdjęcie z dnia 1 zapisane',
  'Could not read that file.': 'Nie mogę odczytać tego pliku.',
  Replace: 'Zmień zdjęcie',
  'Change date': 'Zmień datę',
  'Delete photo': 'Usuń zdjęcie',
  Close: 'Zamknij',
  'Previous month': 'Poprzedni miesiąc',
  'Next month': 'Następny miesiąc',
  // header / streak
  'day streak': 'dni z rzędu',
  Streak: 'Seria',
  'Done for today.': 'Na dziś zrobione.',
  'Log anything today to keep it going.': 'Zapisz cokolwiek dziś, żeby ją podtrzymać.',
  // gym
  'Paste your plan': 'Wklej swój plan',
  'Any format. Exercises, sets, reps, weights.': 'Dowolny format. Ćwiczenia, serie, powtórzenia, ciężary.',
  Paste: 'Wklej',
  'Which days do you train?': 'W które dni trenujesz?',
  'Done for today': 'Na dziś zrobione',
  'Workout done': 'Trening zrobiony',
  'You showed up. That counts.': 'Pojawiłeś się. To się liczy.',
  Strength: 'Siła',
  Set: 'Seria',
  sets: 'serii',
  'Your plan': 'Twój plan',
  Save: 'Zapisz',
  'No exercises found. Try one per line.': 'Nie znaleziono ćwiczeń. Wpisz jedno w linii.',
  'Does this look right?': 'Czy to się zgadza?',
  'Looks good': 'Wygląda dobrze',
  'Add at least one exercise.': 'Dodaj co najmniej jedno ćwiczenie.',
  'Plan ready': 'Plan gotowy',
  Back: 'Wstecz',
  'Your workout plan': 'Twój plan treningowy',
  'Hold the box and choose Paste.': 'Przytrzymaj pole i wybierz Wklej.',
  'Reading your plan…': 'Czytam Twój plan…',
  'Build my plan': 'Zbuduj mój plan',
  'Finish workout': 'Zakończ trening',
  'Workout summary': 'Podsumowanie treningu',
  'set up': 'seria lepsza',
  'sets up': 'serii lepszych',
  'new best': 'nowy rekord',
  'new bests': 'nowe rekordy',
  'total work': 'łączna praca',
  'two workouts to start': 'dwa treningi na start',
  'New best': 'Nowy rekord',
  Slipping: 'Spadek',
  'last time': 'ostatnio',
  'not done yet': 'jeszcze nie zrobione',
  'more weight, fewer reps': 'więcej kg, mniej powtórzeń',
  'less weight, more reps': 'mniej kg, więcej powtórzeń',
  'Add exercise': 'Dodaj ćwiczenie',
  'Lines I skipped': 'Pominięte linie',
  'Add workout': 'Dodaj trening',
  'Button name': 'Nazwa przycisku',
  'Delete workout': 'Usuń trening',
  'Day of the week': 'Dzień tygodnia',
  'Exercise name': 'Nazwa ćwiczenia',
  Exercise: 'Ćwiczenie',
  Sets: 'Serie',
  Reps: 'Powt.',
  'Tap anything to change it.': 'Dotknij czegokolwiek, by zmienić.',
  // settings
  Goal: 'Cel',
  Cut: 'Redukcja',
  Bulk: 'Masa',
  Maintain: 'Utrzymanie',
  'Goal weight': 'Waga docelowa',
  Units: 'Jednostki',
  Training: 'Trening',
  'Edit plan': 'Edytuj plan',
  'Paste a new plan': 'Wklej nowy plan',
  'Set up your plan': 'Ustaw swój plan',
  Account: 'Konto',
  'This device': 'To urządzenie',
  Guest: 'Gość',
  'Import backup': 'Importuj kopię zapasową',
  'Backup restored': 'Kopia przywrócona',
  'That file is not a Kilo backup.': 'To nie jest kopia Kilo.',
  'To move your data from the website to the app: export here, send the file to your phone, then import it in the app.': 'Aby przenieść dane ze strony do aplikacji: wyeksportuj tutaj, wyślij plik na telefon i zaimportuj go w aplikacji.',
  'Test AI': 'Testuj AI',
  'Fill in the key first.': 'Najpierw wpisz klucz.',
  'Testing…': 'Testuję…',
  'Sign out': 'Wyloguj',
  Data: 'Dane',
  'Load sample data': 'Wczytaj dane przykładowe',
  'Sample data loaded': 'Dane przykładowe wczytane',
  'Export my data': 'Eksportuj moje dane',
  'Delete everything': 'Usuń wszystko',
  'Delete everything?': 'Usunąć wszystko?',
  'All weights, photos and workouts on this device. This cannot be undone.':
    'Wszystkie wagi, zdjęcia i treningi na tym urządzeniu. Tego nie da się cofnąć.',
  Delete: 'Usuń',
  'Keep my data': 'Zachowaj moje dane',
  Language: 'Język',
  'Start of your journey': 'Początek Twojej drogi',
  'Day 1 date': 'Data dnia 1',
  'Day 1 weight': 'Waga w dniu 1',
  'Training for': 'Trenuję od',
  days: 'dni',
  months: 'mies.',
  years: 'lat',
  'Not training since today? Set when you really started. Day 1 moves to that date.':
    'Nie zacząłeś dziś? Ustaw, kiedy naprawdę zacząłeś. Dzień 1 przesunie się na tę datę.',
  'Add a weight or a photo first.': 'Najpierw dodaj wagę lub zdjęcie.',
  Photos: 'Zdjęcia',
  'Import photos': 'Importuj zdjęcia',
  'Pick many photos at once. Kilo reads the date each one was taken and sorts them from newest to oldest, one per day. The oldest becomes your Day 1 photo and the newest your latest. You can change any date later.':
    'Wybierz wiele zdjęć naraz. Kilo odczyta datę wykonania każdego i ułoży je od najnowszego do najstarszego, po jednym na dzień. Najstarsze stanie się zdjęciem dnia 1, a najnowsze ostatnim. Każdą datę możesz potem zmienić.',
  'AI for your plan': 'AI do Twojego planu',
  'Reads a pasted plan, in any language. Off = built-in reader.':
    'Czyta wklejony plan w dowolnym języku. Wyłączone = wbudowany czytnik.',
  Off: 'Wył.',
  Provider: 'Dostawca',
  'API key': 'Klucz API',
  Model: 'Model',
  'Base URL': 'Adres API',
  Local: 'Lokalny',
  'Key stays on this device and goes only to the provider you picked. Local = Ollama or LM Studio on your computer (the phone must reach it).':
    'Klucz zostaje na tym urządzeniu i trafia tylko do wybranego dostawcy. Lokalny = Ollama lub LM Studio na Twoim komputerze (telefon musi mieć do niego dostęp).',
  'Google client ID': 'Google client ID',
  'Language changed': 'Język zmieniony',
}

type Rule = [RegExp, (...m: string[]) => string]
const RULES: Rule[] = [
  [/^(\d+)-day streak$/, (_, n) => `Seria: ${n} dni`],
  [/^(\d+) days in a row$/, (_, n) => `${n} dni z rzędu`],
  [/^New (low|high) · (.+)$/, (_, k, v) => `${k === 'low' ? 'Nowe minimum' : 'Nowe maksimum'} · ${v}`],
  [/^Moved to (.+)$/, (_, d) => `Przeniesiono na ${d}`],
  [
    /^(\d+) added, sorted newest to oldest(?: · (\d+) skipped)?$/,
    (_, a, k) => `Dodano ${a}, od najnowszego do najstarszego${k ? ` · pominięto ${k}` : ''}`,
  ],
  [/^Dated (.+), the day it was taken$/, (_, d) => `Data: ${d}, dzień wykonania zdjęcia`],
  [/^since (.+)$/, (_, d) => `od ${d}`],
  [/^1 day a week$/, () => '1 dzień w tygodniu'],
  [/^(\d+) days a week$/, (_, n) => `${n} dni w tygodniu`],
  [/^(\d+) sets$/, (_, n) => `${n} serii`],
  [/^New best · (.+)$/, (_, n) => `Nowy rekord · ${n}`],
  [/^Weight, (.+)$/, (_, d) => `Waga, ${d}`],
  [/^Calories, (.+)$/, (_, d) => `Kalorie, ${d}`],
  [/^Clear set (\d+)$/, (_, n) => `Wyczyść serię ${n}`],
  [/^Set (\d+): same as last time$/, (_, n) => `Seria ${n}: tak samo jak ostatnio`],
  [/^(.+), set (\d+), weight$/, (_, e, n) => `${e}, seria ${n}, ciężar`],
  [/^(.+), set (\d+), reps$/, (_, e, n) => `${e}, seria ${n}, powtórzenia`],
  [/^Remove (.+)$/, (_, n) => `Usuń ${n === 'exercise' ? 'ćwiczenie' : n}`],
  [/^AI failed \((.*)\)\. Using built-in reader\.$/, (_, e) => `AI nie zadziałało (${e}). Używam wbudowanego czytnika.`],
  [/^Add a photo or video for (.+)$/, (_, d) => `Dodaj zdjęcie lub wideo: ${d}`],
  [/^Open photo from (.+)$/, (_, d) => `Otwórz zdjęcie z ${d}`],
  [/^(.+), logged$/, (_, d) => `${d}, zapisano`],
  [/^Goal (.+)$/, (_, v) => `Cel ${v}`],
]

function tr(s: string): string {
  if (lang() === 'en') return s
  const t = s.trim()
  if (!t) return s
  let out: string | undefined = PL[t]
  if (!out) for (const [re, fn] of RULES) {
    const m = re.exec(t)
    if (m) {
      out = fn(...(m as unknown as string[]))
      break
    }
  }
  return out ? s.replace(t, out) : s
}

type Rec = { src: string; shown: string }
const texts = new WeakMap<Text, Rec>()
const attrs = new WeakMap<Element, Record<string, Rec>>()
const ATTRS = ['aria-label', 'placeholder', 'title']

function doText(n: Text) {
  const rec = texts.get(n)
  const src = rec && n.data === rec.shown ? rec.src : n.data
  const shown = tr(src)
  texts.set(n, { src, shown })
  if (shown !== n.data) n.data = shown
}

function doAttrs(el: Element) {
  const all = attrs.get(el) ?? {}
  for (const a of ATTRS) {
    const cur = el.getAttribute(a)
    if (cur == null) continue
    const rec = all[a]
    const src = rec && cur === rec.shown ? rec.src : cur
    const shown = tr(src)
    all[a] = { src, shown }
    if (shown !== cur) el.setAttribute(a, shown)
  }
  attrs.set(el, all)
}

export function translateTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return doText(root as Text)
  if (root.nodeType !== Node.ELEMENT_NODE) return
  const el = root as Element
  if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return
  doAttrs(el)
  el.childNodes.forEach(translateTree)
}

let started = false
export function startTranslator() {
  if (started) return
  started = true
  document.documentElement.lang = lang()
  translateTree(document.body)
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'childList') m.addedNodes.forEach(translateTree)
      else if (m.type === 'characterData') doText(m.target as Text)
      else if (m.type === 'attributes') doAttrs(m.target as Element)
    }
  }).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  })
}
