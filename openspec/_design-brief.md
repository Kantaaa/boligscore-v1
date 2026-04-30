Boligscore v2 — Design Brief
1. Produkt-kontekst
Boligscore er en norsk webapp (PWA) som hjelper par/familier å vurdere og sammenligne boliger strukturert. Primær use-case: man er på visning eller leser FINN-annonser, og vil at begge parter skal kunne score boligen uavhengig, se hvor de er enige/uenige, og lande på en felles total.

Språk: Norsk (bokmål) i hele UI
Primær enhet: Mobil (brukes på visning). Desktop er sekundært (hjemme, scroller FINN)
Teknisk: React/Next.js app, men design-AI trenger ikke tenke på det — dette er ren UX/UI
Installbar: Som PWA på mobil (hjemskjerm-ikon, fullskjerm)

2. Målgruppe & tone
Par i 25–45 år som skal kjøpe bolig sammen
Ofte første bolig sammen; finansielt og emosjonelt viktig
Teknisk komfortable, men ikke spesialister
Tone: Rolig, ryddig, trygg. Ikke leken eller barnslig. Ikke kald corporate. Tenk Notion meets norsk folkelighet.
Visuelt: Lyst tema som standard, dark mode som valg. Moderat avrundede hjørner. Myke farger. Tydelig typografi (san-serif). Plass og luft fremfor tettpakket data.

3. Kjerneproblem
Når to personer skal kjøpe bolig sammen:
Man husker forskjellig etter visning
Magefølelse dominerer — vanskelig å sammenligne bolig A mot B rasjonelt
Uenighet blir krangel fordi det mangler et felles språk ("jeg synes kjøkkenet var fint" vs "nei det var dårlig")
Ingen struktur — notater på papir, i hodet, i forskjellige apper

Boligscore løser dette ved:
Uavhengig scoring per person (ikke påvirket av partner)
Synlig sammenligning (se hvor dere er uenige uten å krangle)
Felles-karakter dere blir enige om etter diskusjon
Vektet totalscore som lar dere rangere boliger mot hverandre

4. Informasjonsarkitektur
Hovednavigasjon (bunnmeny på mobil, sidemeny på desktop):
Boliger — forsiden, liste over husholdningens boliger
Vekter — hvor mye hvert kriterium teller
Husstand — medlemmer og invitasjoner
Meg — profil og innstillinger
Øverst på hver side: Husholdning-velger (hvis brukeren er med i flere). Liten chip/dropdown som viser aktiv husholdning, f.eks. "🏠 Ine & Kanta ▾".

5. Flyter
Flyt A: Førstegangs-bruker
Landingsside (/) — kort intro: "Score boliger sammen. Bli enige raskere." CTA: Logg inn / Registrer. Hero-bilde eller subtil illustrasjon.
Registrer (/registrer) — e-post + passord (og magic-link-alternativ). Minimalt skjema.
Onboarding: opprett husholdning (/app/onboarding) — ett felt: "Hva skal vi kalle husholdningen deres?" (eksempel: "Ine & Kanta" eller "Vårt boligsøk"). Etter opprettelse vises to knapper:
Kopier invitasjonslenke (primær)
Send via e-post (sekundær, åpner felt for e-postadresse) Forklarende tekst: "Send denne lenken til din partner for å score boliger sammen." Under: "Hopp over — legg til senere" (kan bruke appen alene først)
Tom forside (/app) — illustrasjon + "Ingen boliger ennå. Legg til den første du så på FINN eller var på visning." Stor CTA: "+ Legg til bolig".

Flyt B: Partner aksepterer invitasjon
Klikk lenke → /invitasjon/[token] → hvis ikke logget inn, via registrering/innlogging først
Konfirmasjons-side: "Ine har invitert deg til husholdningen 'Ine & Kanta'. Godta?" → knapp "Bli med"
Lander på forsiden, nå delt med partner

Flyt C: Legge til bolig
Trykk FAB (floating action button) "+ Ny bolig" på forsiden
Modal eller egen side med to tabs øverst:
Fra FINN-lenke (default, anbefalt)
Manuelt
Fra FINN-lenke: input-felt ("Lim inn FINN-lenke"), parse-knapp, deretter visning av hva som ble funnet (adresse, pris, BRA, byggeår, bilde) med mulighet til å redigere. Hvis parsing feiler: tydelig melding + auto-hopp til manuelt skjema med det som lot seg hente.
Manuelt skjema: gruppert i seksjoner
Adresse & FINN-lenke
Prisinfo (totalpris, omkostninger, felleskostnader)
Størrelse (BRA, primærrom, soverom, bad)
Basis-fakta (byggeår, boligtype, etasje)
Status (dropdown): Favoritt / Vurderer / På visning / I budrunde / Bud inne / Kjøpt / Ikke aktuell
"Lagre bolig" → går til boligens detaljside

Flyt D: Score en bolig (uavhengig, per bruker)
Åpne bolig fra listen → landing på Oversikt-tab (fakta + bilde + status)
Tab-navigasjon: Oversikt / Min vurdering / Sammenligning / Kommentarer / Notater
Min vurdering: kriterier gruppert i seksjoner:
Bolig innvendig (kjøkken, bad, planløsning, lys og luftighet, oppbevaring, stue, balkong/terrasse)
Beliggenhet & område (områdeinntrykk, nabolagsfølelse, offentlig transport, skoler/barnehager)
Helhet (inntrykk på visning, potensial)
Fakta (auto-beregnet: pris/kvm, størrelse, alder — read-only, bare vist)
Per kriterium: label, kort beskrivelse, chip-rad 0–10 (eller slider). Tap for å velge. Autolagrer umiddelbart med subtil "lagret"-indikator.
Mangler score? Rad vises grå med "— (ikke scoret)"-indikator. Ingen tvang, men telleren øverst viser "13 av 22 kriterier scoret".
Notatblokk nederst per seksjon (privat) — for rask huskelapp ("kjøkkenet mangler oppvaskmaskin").

Flyt E: Sammenligne og bli enige
Åpne Sammenligning-tab — forutsetter at minst du har scoret
Øverst: Totalscore-panel
Stor "Felles: 78/100" (hovedtall, basert på felles-karakter × felles-vekter)
Under: mindre "Din: 76" og "Kanta: 82" som sekundære tall
Advarsel hvis ufullstendig: "⚠ 3 kriterier mangler score — regnes som 0 i totalen"
Matrise (Layout A):
Kriterium       Ine    Kanta    Snitt    Felles
Kjøkken          7       8       7.5      [8]
Bad              7       7       7         [7]
Beliggenhet      6       9       7.5      [7]
"Felles"-kolonnen er redigerbar inline (tap på tallet åpner chip-velger)
Forhåndsutfylt med snitt som default, men begge kan justere
Store uenigheter (|Δ| ≥ 3) markeres subtilt (f.eks. gul bakgrunn på raden)
Rader gruppert etter seksjon (samme seksjoner som scoring)
Ingen explicit "commit"-knapp — live lagring. Den som sist redigerte "felles" er den som står.

Flyt F: Navigere listen
Forsiden viser kort per bolig, sortert etter Felles totalscore som default
Hver kort:
Bilde (thumbnail, fra FINN eller upload)
Adresse
Pris • BRA • byggeår
Felles: 78 • Din: 76
Status-badge (fargekodet: favoritt=gul, vurderer=blå, på visning=lilla, i budrunde=oransje, bud inne=rød, kjøpt=grønn, ikke aktuell=grå)
Sortering: Felles total, Pris, Nyeste først, Din score
Filter-panel (bottom sheet på mobil, popover på desktop): status, prisspenn, BRA-spenn, område (tekstsøk)
Søkefelt øverst for fritekst (adresse, kommentar, notat)

Flyt G: Vekter
Vekter-siden viser ett segmented control øverst: "Felles vekter" (default) / "Mine personlige vekter"
Felles vekter: liste over alle 22 kriterier gruppert i samme seksjoner som scoring. Per kriterium: label, kort beskrivelse, slider 0–10.
Endringer er delt — sambo ser endringen
Live visning av hvordan totalscore påvirkes? Valgfri, kan droppes for MVP.
Personlige vekter (valgfri): samme view, men ved siden av hver rad står husholdnings-vekten som "standard". Du kan overstyre — blank = bruk standard.

Flyt H: Husstand
Husstand-siden viser:
Husholdningens navn (redigerbart)
Medlemmer (liste med avatar + navn + rolle)
Invitasjonspanel: "Kopier lenke" + "Send på e-post"
Avanserte: forlat husholdning, slett husholdning (bare eier)
Hvis bruker er med i flere husholdninger: bytte-pil øverst (som også vises på forsiden)

Flyt I: Meg
Profil (navn, avatar, e-post)
Tema (lys/mørk/auto)
Varsler (senere, PWA-push)
Logg ut

6. Sentrale UI-elementer (komponent-språk)
Score-chip-rad: 11 chips (0 til 10) i en horisontal rad, kompakt. Valgt chip fylt i primærfarge, andre outline. Touch-vennlig (min 40×40px).
Kort for bolig: avrundet kort, skygge, bilde øverst full-bredde eller venstre. Text-hierarki tydelig.
Totalscore-badge: stor rund eller avrundet rektangel med tall og liten label ("Felles" / "Din").
Status-badge: liten pill med ikon + tekst, fargekodet.
FAB: stor rund knapp nederst høyre på forsiden (legg til bolig).
Tabs: horisontal, underline-stil, scrollbar på mobil hvis mange.
Seksjon-overskrifter: stor fet tekst + liten beskrivelse under.

7. Mobil-først prinsipper
All primær-interaksjon må fungere med én hånd
Touch-mål minst 44×44px
Ingen hover-avhengige interaksjoner
Bunnmeny for navigasjon (tommel-rekkevidde)
FAB for primær CTA (legg til bolig)
Bottom sheets for filtre, modals for destruktive handlinger

8. Tilgjengelighet
Kontrastforhold AA minimum
Ikoner always with text-label (not only icon)
Focus-ring visible on tab-navigation
Status not only color (also icon or text)

9. Tom-tilstander
Ingen boliger: illustrasjon + forklaring + CTA "Legg til første bolig"
Ingen scores ennå: "Du har ikke scoret denne boligen. Start med kriteriene under."
Partner har ikke scoret: "Venter på Kanta sin vurdering" — vis bare dine scores i compare
Ingen husholdning: onboarding-flyt tar over

10. Feil-tilstander
FINN-import feilet: "Klarte ikke lese FINN-annonsen. Fyll inn manuelt." — skjemaet prefilles med det som gikk å hente
Ingen nett: liten banner "Du er offline — endringer synkes når du er tilbake online" (men MVP krever nett, så bare vis feil)
Invitasjon utløpt: "Denne lenken har utløpt. Be om en ny."

11. Farger (forslag)
Primær: rolig blå eller dempet grønn (tenk trygg/tillit)
Status-farger: ikke for mettet — pastell-aktig
Nøytrale: varm grå (ikke ren kald grå)
Aksent: én enkelt aksentfarge for CTA-er
Inspirasjon: Linear, Notion, Things 3, Arc Search.