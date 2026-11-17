// COPROCIV — règlement de copropriété type, aligné sur la loi n° 2019-576 du 26 juin 2019
// (Code de la Construction et de l'Habitat), Livre 2, Titre 1, Sous-titre 1 : articles 379 à 407.
// Chaque article porte :
//   ref : articles du Code sur lesquels il s'appuie (affichés à l'auteur, pas dans l'acte) ;
//   n   : note à l'auteur (choix à faire, point à vérifier) — jamais imprimée.
// Les champs [[...]] sont remplacés par les données du dossier.

export const INIT_ART = [
  {
    id: 'a1', t: 'Objet et cadre légal', k: 'text', ref: 'Art. 379',
    x: "Le présent règlement de copropriété est établi en application de la loi n° 2019-576 du 26 juin 2019 instituant le Code de la Construction et de l'Habitat, Livre 2, Titre 1, Sous-titre 1 relatif à la copropriété (articles 379 à 407), et de ses textes d'application.\n\nIl s'applique à l'immeuble bâti sis [[ADRESSE]], divisé en lots comprenant chacun une partie privative et une quote-part des parties communes. Il détermine la destination des parties privatives et des parties communes, les conditions de leur jouissance, la répartition des charges et les règles d'administration de l'immeuble."
  },
  {
    id: 'a2', t: "Désignation de l'immeuble", k: 'text', ref: 'Art. 379',
    x: "L'immeuble est immatriculé au Livre foncier sous le titre foncier [[TF]] ([[CADASTRE]]), pour une contenance de [[CONTENANCE]]. Arrêté de concession définitive : [[ACD]].\n\nL'ensemble immobilier comprend [[BATIMENTS]]. Il est divisé en [[NB_LOTS]] lots.",
    n: "La loi ne s'applique qu'aux immeubles immatriculés (art. 379, al. 3) : le titre foncier est exigé pour certifier l'EDD."
  },
  {
    id: 'a3', t: 'État descriptif de division', k: 'edd', ref: 'Art. 379, 82',
    x: "Le tableau ci-après, établi par le géomètre-expert, désigne chaque lot, sa partie privative et la quote-part des parties communes générales qui lui est attachée, exprimée en [[BASE]].\n\nLes quotes-parts sont déterminées d'après la consistance, la superficie et la situation de chaque lot. La superficie de chaque partie est pondérée par des coefficients de nature, d'annexe, de niveau et de situation : Sp = (S × c nature + S annexe × c annexe) × c niveau × c situation. La quote-part de chaque lot est égale à Sp / Σ Sp × [[TOTAL]], arrondie selon la méthode du plus fort reste afin que leur somme soit exactement égale à [[TOTAL]].",
    n: "Le sous-titre copropriété ne fixe pas de méthode de calcul des quotes-parts. Les critères retenus reprennent ceux de l'article 82 (consistance, superficie, situation) par analogie."
  },
  {
    id: 'a4', t: "Destination de l'immeuble", k: 'text', ref: '',
    x: "L'immeuble est à usage mixte d'habitation et commercial. Les lots du rez-de-chaussée peuvent être affectés à toute activité commerciale, à l'exclusion des activités bruyantes, malodorantes ou dangereuses."
  },
  {
    id: 'a5', t: 'Parties privatives', k: 'text', ref: 'Art. 379',
    x: "Sont privatives les parties des bâtiments et des terrains réservées à l'usage exclusif d'un copropriétaire déterminé, telles qu'elles sont désignées à l'état descriptif de division : notamment les carrelages et revêtements de sol, les plafonds et enduits intérieurs, les cloisons intérieures non porteuses, les portes palières, fenêtres et volets, les appareils sanitaires et les canalisations intérieures desservant exclusivement le lot.\n\nChaque copropriétaire use et jouit librement de ses parties privatives, sous réserve de ne porter atteinte ni aux droits des autres copropriétaires, ni à la destination de l'immeuble, ni à sa solidité."
  },
  {
    id: 'a6', t: 'Parties communes générales', k: 'text', ref: 'Art. 380, 383, 384',
    x: "Sont parties communes les parties bâties ou non bâties destinées à l'usage et à la jouissance de l'ensemble des copropriétaires ou de certains d'entre eux, notamment : le sol ; le gros œuvre, les fondations, les murs porteurs et les caves quelle que soit leur profondeur ; la façade ; les toits destinés à l'usage commun ; les escaliers, passages et corridors d'usage commun ; les loges des gardiens ; les entrées, sous-sols et ascenseurs d'usage commun ; les murs et cloisons séparant deux appartements ou locaux ; les équipements communs, y compris leurs parties qui traversent les parties privatives ; les coffres, têtes de cheminée et bouches d'aération d'usage commun.\n\nSont également parties communes, sauf stipulation contraire des titres de propriété : les toitures et balcons non affectés initialement à l'usage individuel, les cours et jardins, et les locaux destinés à l'usage commun.\n\nLes parties communes générales appartiennent indivisément à l'ensemble des copropriétaires, à concurrence de [[TOTAL]] tantièmes. Les parcelles relevant des parties communes sont la propriété exclusive des copropriétaires représentés par le syndicat."
  },
  {
    id: 'a7', t: 'Parties communes spéciales et charges spéciales', k: 'grilles', ref: 'Art. 383',
    x: "Sont parties communes spéciales les éléments affectés à l'usage ou à l'utilité de certains copropriétaires seulement. Elles appartiennent indivisément aux seuls copropriétaires des lots concernés. Les charges correspondantes sont réparties entre eux comme suit :"
  },
  {
    id: 'a8', t: 'Droits accessoires aux parties communes', k: 'text', ref: 'Art. 385',
    x: "Sont droits accessoires aux parties communes : le droit de surélever l'immeuble, le droit d'édifier de nouvelles constructions dans les cours ou les jardins et dans leurs sous-sols, et le droit d'excavation. Leur exercice est subordonné à l'accord de l'assemblée générale et à l'autorisation du Ministre chargé de l'Urbanisme."
  },
  {
    id: 'a9', t: 'Répartition des charges générales', k: 'text', ref: 'Art. 387, 403',
    x: "Les charges de conservation, d'entretien et d'administration des parties communes générales sont réparties entre tous les copropriétaires proportionnellement aux quotes-parts de parties communes attachées à leurs lots, telles qu'elles figurent à l'état descriptif de division.\n\nLes charges entraînées par les services collectifs et les éléments d'équipement commun sont réparties selon les grilles de charges spéciales figurant au présent règlement. Toute modification de la répartition des charges relève de l'assemblée générale."
  },
  {
    id: 'a10', t: 'Syndicat des copropriétaires', k: 'text', ref: 'Art. 380 à 382',
    x: "Les copropriétaires sont groupés de plein droit en un syndicat qui les représente. Le syndicat a pour mission la conservation de l'immeuble et l'administration des parties communes.\n\nÀ ce titre, il prend l'initiative de toute action concourant à un bon cadre de vie, notamment : le ravalement des façades et des murs des parties communes ; la préservation des réseaux d'assainissement, d'adduction d'eau et de drainage ; l'entretien des espaces verts ; la mise en œuvre des mesures de sécurité ; le ramassage des ordures ; l'éclairage des parties communes et des escaliers ; l'entretien des ascenseurs ; le respect des normes d'urbanisme, des règles de bon voisinage et des règles d'hygiène et de salubrité.\n\nLe syndicat comprend trois organes : l'assemblée générale, le conseil syndical et le syndic."
  },
  {
    id: 'a11', t: 'Assemblée générale', k: 'text', ref: 'Art. 386 à 389',
    x: "L'assemblée générale des copropriétaires se réunit sur convocation du conseil syndical. Elle prend les décisions relatives à l'administration et à la gestion de l'immeuble, notamment : l'adoption et la modification du présent règlement ; les modifications de la classification en parties communes et parties privatives ; la destruction de l'immeuble ; les décisions relatives aux parties communes ; la détermination des charges et la modification de leur répartition ; la désignation des membres du conseil syndical ; la désignation et la destitution du syndic ; la fixation des cotisations mensuelles ordinaires et des cotisations spéciales pour grosses réparations ; l'emploi des ressources du syndicat ; la fixation de la rémunération du syndic ; les commissions et appuis divers.\n\nSes décisions s'imposent à tous les copropriétaires et à tout attributaire de lot en jouissance. Les décisions prises en dehors des attributions du syndicat sont nulles et de nul effet."
  },
  {
    id: 'a12', t: 'Voix et majorités', k: 'text', ref: 'Art. 400',
    x: "Chaque copropriétaire dispose d'un nombre de voix égal au nombre de tantièmes de parties communes générales attachés à ses lots. Pour les décisions relatives aux charges spéciales, seuls votent les copropriétaires des lots concernés, à proportion de leur participation à ces charges.\n\nSauf disposition légale contraire, les décisions sont prises à la majorité des voix des copropriétaires présents ou représentés. L'assemblée ne délibère valablement que si les copropriétaires présents ou représentés réunissent au moins la moitié des voix.\n\nLa destitution du syndic pour motif légitime est prononcée à la majorité des membres présents.",
    n: "La loi ne fixe ni le nombre de voix ni les quorums : ce sont des choix du règlement, à confirmer avec le notaire et les textes d'application. Seule la révocation du syndic est réglée par la loi (art. 400 : majorité des membres présents)."
  },
  {
    id: 'a13', t: 'Conseil syndical', k: 'text', ref: 'Art. 392, 393',
    x: "Le conseil syndical est constitué d'au moins trois copropriétaires à jour de leurs cotisations, désignés par l'assemblée générale pour la durée qu'elle détermine. Copie du procès-verbal de leur désignation est transmise au Ministre en charge du Logement et à la Mairie de la commune.\n\nLe conseil syndical assiste le syndic et contrôle sa gestion. Il fait office de commissaire aux comptes du syndicat. Il supplée le syndic en cas de démission, de décès, d'incapacité, de carence ou d'indisponibilité, jusqu'à la désignation d'un nouveau syndic."
  },
  {
    id: 'a14', t: 'Syndic', k: 'text', ref: 'Art. 394 à 401',
    x: "Le syndic représente le syndicat et agit en son nom et pour son compte. Il est désigné par l'assemblée générale sur la liste des syndics agréés par le Ministre chargé du Logement ; sa désignation est entérinée par arrêté de ce Ministre.\n\nLe syndic est chargé : d'assurer le secrétariat de l'assemblée générale ; de remettre copie du présent règlement à tous les copropriétaires et à tous les locataires, et de veiller à son application ; d'assurer la conservation, la garde, l'entretien et la réparation des parties communes ; d'établir le budget et de tenir la comptabilité du syndicat sous le contrôle du conseil syndical ; d'engager, sur avis du conseil syndical, le personnel nécessaire ; de mettre en œuvre les décisions de l'assemblée générale ; de représenter le syndicat en justice.\n\nLe syndic ne contracte, en cette qualité, aucune obligation personnelle. Il peut être démis de ses fonctions pour motif légitime, notamment négligence, omission, inexécution d'une obligation ou fraude prouvée."
  },
  {
    id: 'a15', t: 'Cotisations et recouvrement', k: 'text', ref: 'Art. 397, 402 à 406',
    x: "Le taux des cotisations mensuelles est fixé par l'assemblée générale. Chaque copropriétaire est tenu du paiement mensuel des charges de copropriété afférentes à ses lots. La cotisation peut être prélevée sur le locataire, à charge pour celui-ci de la compenser sur le loyer lorsque son bail ne l'oblige pas à la payer.\n\nLes cotisations ne peuvent être employées que pour les besoins de la copropriété, déduction faite de trente pour cent (30 %) au plus affectés à la rémunération du syndic, aux commissions et aux appuis divers. Leur emploi à des activités sociales ou contraires aux nécessités de la copropriété est interdit.\n\nLes fonds du syndicat sont déposés sur un compte bancaire séparé ouvert à son nom.\n\nLe recouvrement est assuré par le syndic ou par un cabinet de recouvrement désigné par l'assemblée générale. En cas de non-paiement, le syndic adresse une lettre de relance au copropriétaire défaillant puis, à défaut d'exécution, engage une action en recouvrement forcé."
  },
  {
    id: 'a16', t: 'Information des copropriétaires et des occupants', k: 'text', ref: 'Art. 390, 395, 417',
    x: "Tout copropriétaire peut consulter toute pièce comptable et toute quittance du syndicat, et obtenir communication de toute information qu'il sollicite.\n\nLe présent règlement est remis à chaque copropriétaire et à chaque locataire. Le copropriétaire bailleur communique à son locataire, à sa demande, les extraits du règlement concernant la destination de l'immeuble, la jouissance et l'usage des parties privatives et communes, et la quote-part du lot loué dans chaque catégorie de charges."
  },
  {
    id: 'a17', t: 'Règlement des différends', k: 'text', ref: 'Art. 407',
    x: "Les difficultés de toute nature pouvant naître entre copropriétaires et syndicat relativement à la jouissance et à l'administration des parties communes et aux conditions de jouissance des parties privatives peuvent être soumises à l'arbitrage du Ministère en charge de la Construction et du Logement, qui se prononce dans un délai de quarante-cinq (45) jours à compter de la demande."
  }
];

export const CLAUSES = [
  { t: 'Lots transitoires', x: "Les lots n° … sont constitués en lots transitoires. Ils comportent une partie privative constituée d'un droit de construire précisément défini et une quote-part des parties communes correspondante." },
  { t: 'Parties communes à jouissance privative', x: "La terrasse attenante au lot n° … est une partie commune à jouissance privative. Son titulaire en assure l'entretien courant ; les travaux affectant l'étanchéité restent à la charge du syndicat." },
  { t: 'Résidence horizontale (villas)', x: "L'ensemble immobilier est constitué de maisons individuelles contiguës ou séparées. Chaque lot comprend, en partie privative, la villa et la parcelle qui lui est affectée ; les voies, réseaux, espaces verts et équipements de la résidence sont parties communes appartenant indivisément à l'ensemble des copropriétaires (art. 379, al. 2)." },
  { t: 'Groupe électrogène, forage et surpresseur', x: "Le groupe électrogène, le forage, le château d'eau et le surpresseur desservant l'immeuble sont des équipements communs. Leurs frais de fonctionnement, d'entretien et de remplacement sont répartis selon la grille de charges spéciale qui leur est affectée." },
  { t: 'Enseignes et vitrines', x: "Les exploitants des lots commerciaux pourront apposer des enseignes en façade du rez-de-chaussée, sous réserve des autorisations administratives et dans le respect de l'harmonie de l'immeuble." },
  { t: 'Locations meublées de courte durée', x: "La location meublée de courte durée des lots d'habitation est soumise à la réglementation en vigueur et ne doit pas porter atteinte à la destination de l'immeuble ni à la tranquillité des occupants." }
];
