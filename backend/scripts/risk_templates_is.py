"""
Icelandic text for standard risk library templates, keyed by English title (seed canonical title).

Used by scripts.seed_risk_templates_and_tutorials.ensure_risk_templates.
"""

from __future__ import annotations

from typing import Dict, TypedDict


class RiskIsFields(TypedDict, total=False):
    title_is: str
    description_is: str
    default_mitigation_is: str


# Keys must match RiskTemplate.title in seed_risk_templates_and_tutorials.RISK_TEMPLATES exactly.
RISK_ICELANDIC_BY_TITLE: Dict[str, RiskIsFields] = {
    "Undersized conductors for design current": {
        "title_is": "Of litlar leiðar miðað við hönnunarstraum",
        "description_is": (
            "Þverskurður leiða er ekki valinn fyrir hönnunarstraum með tilliti til lagningar, "
            "umhverfishita og hópunar. Getur valdið ofhitnun og skemmdum á einangrun."
        ),
        "default_mitigation_is": (
            "Staðfesta hönnunarstraum hverrar rásar; velja leiðar samkvæmt staðlum með viðurkenndum töflum "
            "eða reikniforritum. Skrá forsendur og leiðréttingarstuðla."
        ),
    },
    "Insufficient short-circuit withstand of protective devices": {
        "title_is": "Ónægjanleg brottholsfærni verndarbúnaðar",
        "description_is": (
            "Brotthol (kA) verndartækja er undir fyrirséðum stutningstraum á uppsetningarstað."
        ),
        "default_mitigation_is": (
            "Reikna eða fá fyrirséðan stutningstraum frá dreifiveitu. Velja tæki með nægjanlegri brottholsfærni, "
            "þ.m.t. valkvæmni þar sem krafist er."
        ),
    },
    "Inadequate earthing and bonding": {
        "title_is": "Ófullnægjandi jarðun og jafnspennutenging",
        "description_is": (
            "Verndarleiðar og jafnspennutengingar eru ekki hannaðar til að tryggja örugga bilunaleið, "
            "sem getur valdið hættulegum snertispennu eða seinfærðri aftengingu."
        ),
        "default_mitigation_is": (
            "Hanna jarðkerfi eftir birgðu og staðlum. Staðfesta stærðir og leiðir; krefjast samfelldisprófa og "
            "mælinga á spennu við jarðbilun."
        ),
    },
    "Work on or near live parts": {
        "title_is": "Vinna á eða nálægt spennuðum hlutum",
        "description_is": (
            "Óviljandi snerting við spennuðar leiðar við uppsetningu, prófanir eða bilaleit, með hættu á "
            "rafmagnsstinglum eða bogaflæði."
        ),
        "default_mitigation_is": (
            "Beita öruggri aðskilnaðarferli með skriflegum skrefum (lásun/merking). Banna spennuvinnu nema hún sé "
            "réttlætt og stýrð. Nota einangrað verkfæri og viðeigandi vörn."
        ),
    },
    "Cable damage from sharp edges or supports": {
        "title_is": "Skemmdir á kapli vegna skarpra brúna eða festinga",
        "description_is": (
            "Kaplar lagðir yfir skarpa brún, of þétt beygðir eða án nægilegrar stuðningss, sem getur valdið "
            "skemmdum á skauti og síðar bilunum."
        ),
        "default_mitigation_is": (
            "Nota viðeigandi kaplahald (grommet, söðla, bretti). Virða lágmarks beygjur og festingarfjarlægðir. "
            "Skoða vélfraðlega vernd fyrir spenntingu."
        ),
    },
    "Unsealed penetrations compromising fire compartments": {
        "title_is": "Óþétt göt sem veikja eldivörn",
        "description_is": (
            "Göt eftir kapla eða rör eru ekki þétt með samþykktum eldivarnarefnum, sem skerðir eldþol veggja eða gólf."
        ),
        "default_mitigation_is": (
            "Skrá öll göt; nota prófuð eldivarnakerfi sem henta undirlagi og þjónustu. Halda skjölum og "
            "lokunarupplýsingum við."
        ),
    },
    "Safety devices not functionally tested": {
        "title_is": "Öryggisbúnaður ekki prófaður í verklagi",
        "description_is": (
            "Lekastraumsrofar (RCD), AFDD, neyðarstopp, tengingar við brunakerfi eða aðrir öryggisrásir "
            "hafa ekki verið prófaðar í raunverulegri virkni áður en verki er skilað."
        ),
        "default_mitigation_is": (
            "Gera ræsiplan fyrir afl- og stýrikassa þar sem öllum öryggistengdum búnaði er prófað í virkni. "
            "Skrá niðurstöður prófana og allar lagfæringar í verklokaskýrslu."
        ),
    },
    "Inadequate circuit and panel labelling": {
        "title_is": "Ófullnægjandi merkingar á rásum og tækjakössum",
        "description_is": (
            "Tækjakassar, rofar og rásir eru ekki skýrar merktar, sem getur valdið rekstrarvillum og "
            "óöruggum aðskilnaði."
        ),
        "default_mitigation_is": (
            "Setja endingargóðar merkingar samkvæmt lokunarupplýsingum og töflum. Innifela uppruna, áfangastað og "
            "rásarheiti. Staðfesta við lokaeftirlit."
        ),
    },
    "Overloaded final circuits due to changes in use": {
        "title_is": "Álagning á endarás vegna breyttrar notkunar",
        "description_is": (
            "Núverandi rásir verða ofhlaðnar þegar álag er bætt við án endurskoðunar, með hættu á óþægilegri rofun "
            "eða ofhitnun."
        ),
        "default_mitigation_is": (
            "Koma á ferli fyrir breytingar á álagi. Endurskoða álag aðaltækjakassa og lykilrása, sérstaklega "
            "fyrir hita og hleðslu rafbíla."
        ),
    },
    "Ingress of moisture or dust into equipment": {
        "title_is": "Innrennsli raka eða ryks í búnað",
        "description_is": (
            "Kassar settir upp í erfiðara umhverfi en ætlað var; IP-stig nægir ekki raunverulegum aðstæðum."
        ),
        "default_mitigation_is": (
            "Velja kassa með viðeigandi IP-stigi fyrir svæðið. Skoða reglulega leit að raka, tæringu eða mengun. "
            "Bæta við hitum eða síum þar sem við á."
        ),
    },
    "Main breaker rating not coordinated with upstream protection": {
        "title_is": "Aðalrofi samræmdur ekki við vernd á undan",
        "description_is": (
            "Stærð eða einkenni aðalinntaksrofa stemma ekki við tæki á undan (rofi dreifiveitu eða fæðingu), "
            "sem getur valdið slæmri valkvæmni eða óþægilegri rofun."
        ),
        "default_mitigation_is": (
            "Athuga valkvæmi og keðjutöflur milli tækja. Samræma rofakúrfa og stærðir svo bilun hreinsist á réttu "
            "stigi án óþarfs taps á rafmagni."
        ),
    },
    "Loose terminations at busbars or main lugs": {
        "title_is": "Slakir tengipunktar á safnastrengjum eða aðaltengingum",
        "description_is": (
            "Aðaltengingar ekki nægilega aðþrengdar eða rangt settar saman, með hættu á staðbundinni hitun og bogi."
        ),
        "default_mitigation_is": (
            "Þrýsta aðaltengingar samkvæmt verksmiðjuviðmiðum með kviknum verkfærum. Íhuga hitamyndatöku við ræsingu "
            "og snemma í rekstri."
        ),
    },
    "Inadequate segregation between functional units": {
        "title_is": "Ófullnægjandi aðskilnaður milli virknieininga",
        "description_is": (
            "Rýmum í rofkerfi er ekki skipt rétt, sem eykur hættu á útbreiðslu bilana eða óöruggum aðgangi."
        ),
        "default_mitigation_is": (
            "Tilgreina aðskilnaðarform í hönnun (t.d. Form 2/3/4) og staðfesta við prófaða uppsetningu framleiðanda. "
            "Tryggja að hurðir og hindranir séu rétt settar upp."
        ),
    },
    "Emergency lighting not fed from appropriate circuit": {
        "title_is": "Neyðarljós ekki á viðeigandi rás",
        "description_is": (
            "Neyðarljósgjafar fæddir af rásum sem gætu ekki verið spenntar þegar þarf á þeim að halda við truflun."
        ),
        "default_mitigation_is": (
            "Hanna fæðingu neyðarljóss samkvæmt gildandi kröfum. Staðfesta val rásar, sjálfstæði og prófunaráætlun."
        ),
    },
    "Control failure leaves escape routes unlit": {
        "title_is": "Stýringarbilun lætur flóttaleiðir í myrkri",
        "description_is": (
            "Sjálfvirk lýsing (t.d. nærverunemar) getur óviljandi slökkt á lýsingu sem þarf fyrir örugga brottför."
        ),
        "default_mitigation_is": (
            "Stillta stýringu þannig að flóttaleiðir og stigar haldi lágmarks lýsingu. Staðfesta hegðun við "
            "virkni- og ræsiprófanir."
        ),
    },
    "Incorrect interlocks between fire system and power systems": {
        "title_is": "Röng tenging milli brunakerfis og rafmagnskerfa",
        "description_is": (
            "Úttök brunavörn eru ekki rétt tengd við loftræstingu, reykkapell eða rofun rafmagns."
        ),
        "default_mitigation_is": (
            "Samræma orsök- og afleiðingartöflu við brunahönnuð og LVS. Prófa allar tengingar við heildarprófanir og skrá niðurstöður."
        ),
    },
    "Non fire-rated cables on critical fire alarm circuits": {
        "title_is": "Ekki eldtraustir kaplar á mikilvægum brunaviðvörunarrásum",
        "description_is": (
            "Kaplar fyrir mikilvæga brunagreiningu/brunaviðvörun eru ekki valdir eða lagðir fyrir krafist eldþols."
        ),
        "default_mitigation_is": (
            "Tilgreina eldþola kapla og stuðning þar sem krafist er. Staðfesta leiðir og forðast óvarða svæði eins og unnt er."
        ),
    },
    "Electromagnetic interference to control or data cabling": {
        "title_is": "Rafsegultruflun á stýringar- eða gagnaköplum",
        "description_is": (
            "Afl- og gagnakaplar lagðir saman án aðskilnaðar, sem getur valdið truflun á viðkvæmum rásum."
        ),
        "default_mitigation_is": (
            "Tryggja nægjanlegan fjarlægð eða skermingu samkvæmt framleiðanda og stöðlum. Forðast langar samsíða legur þar sem unnt er."
        ),
    },
    "Single point of failure in communication backbone": {
        "title_is": "Einstakur veikleiki í samskipta bakgrunni",
        "description_is": (
            "Mikilvæm stýring eða eftirlit byggist á einni samskiptaleið án afritunar."
        ),
        "default_mitigation_is": (
            "Íhuga tvíleið eða hringlög fyrir mikilvæg kerfi (BMS, öryggi, brunavörn). Skrá uppbyggingu og prófa "
            "við bilun."
        ),
    },
    "Insufficient capacity for EV charging load": {
        "title_is": "Ónægjanlegt framboð fyrir hleðslu rafbíla",
        "description_is": (
            "Aðalinntak eða dreifing er ekki metin fyrir viðbótarálag hleðslustöðva við álagstopp."
        ),
        "default_mitigation_is": (
            "Framkvæma álagsrannsókn með fjölbreytni og hleðslu atburðum. Veita álagsstýringu eða uppfæra tækjakassa eftir því sem við á."
        ),
    },
    "Incorrect residual current protection for EV chargers": {
        "title_is": "Röng lekastraumsvernd fyrir hleðslustöðvar",
        "description_is": (
            "Tegund lekastraumsrofa hentar ekki hleðslustöðvum sem geta myndað DC-lekastraum, með hættu á tapi verndar."
        ),
        "default_mitigation_is": (
            "Fylgja leiðbeiningum framleiðanda hleðslustöðvar um RCD-tegund og stærð. Nota Type A með RDC-DD eða Type B þar sem krafist er."
        ),
    },
    "Inadequate protection on temporary site supplies": {
        "title_is": "Ófullnægjandi vernd á tímabundnum verkstaðarfæðingu",
        "description_is": (
            "Tímabundnir aflkassar án viðeigandi lekastraumsrofa og yfirstraumsverndar fyrir verkstaðarskilyrði."
        ),
        "default_mitigation_is": (
            "Nota dreifitæki hönnuð fyrir byggingarumhverfi með viðeigandi IP og vernd. Skoða reglulega og prófa RCD."
        ),
    },
    "Trip hazards from temporary cabling": {
        "title_is": "Hætta á falli vegna tímabundinna kapla",
        "description_is": (
            "Kaplar lagðir yfir gönguleiðir eða illa lagðir, sem veldur fallhættu og vélfraðlegum skemmdum."
        ),
        "default_mitigation_is": (
            "Leggja tímabundna kapla uppi eða í vernduðum rásum. Nota kaplahulstur yfir gönguleiðum og merkja leiðir skýrt."
        ),
    },
    "UV degradation of exposed cables": {
        "title_is": "ÚA-birting á útisetum köplum",
        "description_is": (
            "Kaplar án útivistarþols lagðir á þök eða fasöður, sem getur valdið sprungum í skauti með tímanum."
        ),
        "default_mitigation_is": (
            "Tilgreina úA-þola kapla eða vernd fyrir útileiðir. Skoða útisetan kapla reglulega."
        ),
    },
    "Inadequate fall protection for roof-mounted equipment": {
        "title_is": "Ófullnægjandi fallvörn við vinnu á þaki",
        "description_is": (
            "Tæknimenn nálgast búnað á þaki (spenni, PV, LVS) án viðeigandi fallvarnar eða öruggrar aðgangsleiðar."
        ),
        "default_mitigation_is": (
            "Samræma við burðar- og öryggisstjórnun örugga aðgang ( handrið, föst, göngubrýr). Hafa fallvörn í áhættumati og verkferlum."
        ),
    },
    "Incomplete maintenance records for protective devices": {
        "title_is": "Ófullgerð viðhaldsskráning verndarbúnaðar",
        "description_is": (
            "Skortur á skjalfestri prófun/viðhaldssögu fyrir rofa, lekastraumsrofa eða umspennuvernd."
        ),
        "default_mitigation_is": (
            "Koma á viðhaldsdagbók með prófunartímabilum samkvæmt framleiðanda og staðli. Skrá niðurstöður, skipti og stillingar."
        ),
    },
    "Unauthorized modifications to panels or circuits": {
        "title_is": "Óheimilar breytingar á tækjakössum eða rásum",
        "description_is": (
            "Breytingar gerðar af óhæfum aðilum án uppfærðra skjala eða merkinga."
        ),
        "default_mitigation_is": (
            "Takmarka aðgang að rofkerfi, beita breytingastjórnun og endurskoða uppsetningu miðað við teikningar."
        ),
    },
    "Lightning protection not bonded to main earthing system": {
        "title_is": "Þrumuvörn ekki jafnspennt við aðaljarðunarkerfi",
        "description_is": (
            "Jarðun þrumuvörn er ekki samræmd við aðaljarðun byggingar, sem getur valdið hættulegum spennuummun."
        ),
        "default_mitigation_is": (
            "Samræma hönnun þrumuvörn og afljarðunar samkvæmt viðeigandi þrumuvörnustöðlum. Tryggja jafnspennutengingu og prófa samfelldni."
        ),
    },
    "High earth resistance at remote structures": {
        "title_is": "Hár jarðunarviðnám á fjarlægum mannvirkjum",
        "description_is": (
            "Aukabyggingar eða fjarlægur búnaður með ónægjanlegu jarðunarviðnámi fyrir virkni verndartækja."
        ),
        "default_mitigation_is": (
            "Mæla jarðunarviðnám á fjarlægum stöðum og bæta jarðun (viðbótarsúlur, borð, net) eftir því sem við á. "
            "Staðfesta aftengingartíma með verndartækjum."
        ),
    },
    "Unsafe default states on control system failure": {
        "title_is": "Óörugg sjálfgefin ástand við bilun stýrikerfis",
        "description_is": (
            "Tap á stýrirafmagni eða bilun PLC skilur búnað eftir í óöruggu eða óskilgreindu ástandi."
        ),
        "default_mitigation_is": (
            "Hanna örugg sjálfgefin ástand fyrir mikilvægar aðgerðir og lásanir. Prófa hegðun við rafmagnsleysi og endurræsingu við ræsingu."
        ),
    },
    "Inadequate segregation of safety-related control circuits": {
        "title_is": "Ófullnægjandi aðskilnaður öryggistengdra stýringarrása",
        "description_is": (
            "Öryggisvirkni (t.d. neyðarstopp) ekki aðskilin frá venjulegum stýringarrásum, sem eykur hættu á sameiginlegum bilanagáttum."
        ),
        "default_mitigation_is": (
            "Beita aðilöryggi og kaplaðskilnaði fyrir öryggisrásir. Fylgja leiðbeiningum framleiðanda og viðeigendum stöðlum."
        ),
    },
    "Obstructed access to switchgear and panels": {
        "title_is": "Hindraður aðgangur að rofkerfi og tækjakössum",
        "description_is": (
            "Geymsla eða húsgögn hindra aðgang að dreifitækjum, sem torveldar örugga rekstur og viðhald."
        ),
        "default_mitigation_is": (
            "Tilgreina og merkja lágmarks vinnusvæði fyrir framan tækjakassa. Koma kröfum til viðskiptavinar og staðfesta við eftirlit."
        ),
    },
    "Inadequate lighting at electrical equipment": {
        "title_is": "Ófullnægjandi lýsing við rafmagnsbúnað",
        "description_is": (
            "Slæm lýsing við tækjakassa eða vélbúnað, sem eykur hættu á villum við rofun eða viðhald."
        ),
        "default_mitigation_is": (
            "Veita nægjanlega föst lýsingu við öll aðaltækjakassa og stýristöðvar. Staðfesta ljósmagn við ræsingu."
        ),
    },
}

# English category string (seed) -> Icelandic label for UI when lang=is
RISK_CATEGORY_IS: Dict[str, str] = {
    "Design – Cable Sizing": "Hönnun – Stærð leiða",
    "Design – Short Circuit": "Hönnun – Stutningur",
    "Design – Earthing & Bonding": "Hönnun – Jarðun og jafnspennutenging",
    "Installation – Live Working": "Uppsetning – Vinna undir spennu",
    "Installation – Mechanical": "Uppsetning – Vélfraðileg vernd",
    "Installation – Fire Stopping": "Uppsetning – Eldvarnir og þétting",
    "Commissioning – Functional": "Ræsing – Virkni",
    "Commissioning – Labelling": "Ræsing – Merkingar",
    "Operation – Overloading": "Rekstur – Álagning",
    "Operation – Environment": "Rekstur – Umhverfi",
    "Panels – Main Incomer": "Tækjakassar – Aðalinntak",
    "Panels – Busbar Heating": "Tækjakassar – Hitun safnastrengja",
    "Panels – Segregation": "Tækjakassar – Aðskilnaður",
    "Lighting – Emergency": "Ljós – Neyðarljós",
    "Lighting – Controls": "Ljós – Stýring",
    "Fire Systems – Interface": "Brunakerfi – Tengingar",
    "Fire Systems – Cabling": "Brunakerfi – Kaplar",
    "Data – EMC": "Gögn – Rafsegultruflun",
    "Data – Redundancy": "Gögn – Afritun",
    "EV Charging": "Hleðsla rafbíla",
    "Temporary Power": "Tímabundin rafmagnsfæðing",
    "External – Roof": "Úti – Þak",
    "Maintenance": "Viðhald",
    "Earthing & Lightning": "Jarðun og þrumuvörn",
    "Controls & Automation": "Stýringar og sjálfvirkni",
    "Workspace": "Vinnusvæði",
}
