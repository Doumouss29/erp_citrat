// Données de sensibilisation CSST — reproduction fidèle du fichier original.
// 4 modules de 20 questions, 12 fiches mensuelles, liste EPI, contacts d'urgence.

export const QUIZ_DEFS = {
  terrain: {
    code: 'TER',
    title: "Sécurité sur le terrain et chantiers",
    description: "Chantiers, voie publique et bonnes pratiques de sécurité sur le terrain.",
    questions: [
      { q: "Qui doit fournir les équipements de protection individuelle (EPI) sur un chantier ?", opts: ["Le salarié, à ses frais", "L'employeur, gratuitement", "Uniquement pour les postes jugés à risque élevé", "Le comité d'entreprise"], correct: 1, exp: "La fourniture gratuite des EPI par l'employeur découle de l'obligation générale de sécurité (Code du travail, Loi n°2015-532, art. 41.1 à 41.8) et du Décret n°67-321 relatif à l'hygiène et la sécurité, en cohérence avec la convention OIT n°155 ratifiée par la Côte d'Ivoire en 2015." },
      { q: "Le port du casque de chantier est obligatoire :", opts: ["Seulement sur consigne écrite ponctuelle", "En permanence dans les zones signalées à risque de chute d'objets", "Uniquement pour les visiteurs", "Jamais pour le personnel en CDD"], correct: 1, exp: "Obligation générale de protection découlant du Code du travail et du Décret n°67-321 sur l'hygiène et la sécurité." },
      { q: "Pour un travail en hauteur (plus de 3 m) sans protection collective possible, la mesure minimale est :", opts: ["Aucune précaution si le travailleur est expérimenté", "Port d'un harnais antichute relié à un point d'ancrage vérifié", "Une simple échelle suffit", "Attendre un jour de pluie pour reporter les travaux"], correct: 1, exp: "La hiérarchie de prévention (protection collective avant individuelle) est portée par la convention OIT n°167 sur la sécurité et la santé dans la construction." },
      { q: "Avant utilisation, un échafaudage doit faire l'objet de :", opts: ["Une simple vérification visuelle par l'utilisateur", "Une réception par une personne compétente et un suivi dans un registre de vérification", "Aucune vérification si l'échafaudage est loué", "Une vérification annuelle uniquement"], correct: 1, exp: "Principe de prévention des risques applicable aux équipements de travail, conforme aux exigences du Code du travail ivoirien." },
      { q: "Le risque principal d'une tranchée profonde (plus de 1,30 m) est :", opts: ["Le bruit", "L'ensevelissement par éboulement des parois", "Les mauvaises odeurs", "Aucun risque si le sol est sec"], correct: 1, exp: "Le blindage ou le talutage des tranchées est une mesure de prévention standard reconnue internationalement (bonnes pratiques BTP / OIT C167)." },
      { q: "Lorsque plusieurs entreprises interviennent simultanément sur un même chantier (coactivité) :", opts: ["Chaque entreprise gère seule sa sécurité", "Une coordination et un plan de prévention entre les entreprises intervenantes doivent être organisés", "Seul le client final doit être informé", "Seul le voisinage doit être informé"], correct: 1, exp: "La coordination de la prévention entre employeurs est reprise par les référentiels internationaux de management SST (dont l'ISO 45001)." },
      { q: "Une habilitation électrique est nécessaire pour :", opts: ["Toute intervention à proximité d'installations électriques sous tension ou pouvant l'être", "Uniquement les électriciens en CDI", "Jamais si la tension est inférieure à 220 V", "Uniquement les jours de pluie"], correct: 0, exp: "Principe de prévention du risque électrique découlant de l'obligation générale de sécurité de l'employeur (Code du travail, art. 41.1-41.8)." },
      { q: "Le Comité de Santé et Sécurité au Travail (CSST) a pour rôle :", opts: ["Gérer uniquement les salaires", "Contribuer à la prévention des risques professionnels et proposer des améliorations en matière de sécurité et santé", "Remplacer l'inspection du travail", "Ce comité n'existe pas en droit ivoirien"], correct: 1, exp: "Les attributions, la composition et le fonctionnement du CSST sont fixés par le Décret n°2020-955 du 9 décembre 2020, en application des art. 42.1 à 42.3 du Code du travail. Il est obligatoire au-delà de 50 salariés." },
      { q: "En cas d'accident du travail sur un chantier, l'employeur doit :", opts: ["N'a aucune obligation particulière", "Le déclarer à la Caisse Nationale de Prévoyance Sociale (CNPS) dans les délais légaux", "Le déclarer uniquement en cas de décès", "La déclaration est facultative"], correct: 1, exp: "L'employeur dispose de 48 heures pour déclarer l'accident à la CNPS (Loi n°99-477 du 2 août 1999 portant Code de Prévoyance Sociale)." },
      { q: "La signalisation temporaire d'un chantier empiétant sur la voie publique a pour but :", opts: ["Un effet décoratif", "Protéger les usagers et les travailleurs en délimitant et signalant les dangers", "Elle est facultative en zone rurale", "Elle n'est utile que la nuit"], correct: 1, exp: "La signalisation protège usagers et travailleurs en identifiant clairement la zone de danger." },
      { q: "La conduite d'un engin de levage (grue, chariot élévateur) est réservée à :", opts: ["Toute personne majeure présente sur le chantier", "Un personnel formé et titulaire d'une autorisation de conduite (type CACES ou équivalent)", "Le chef de chantier uniquement en cas d'urgence", "Aucune restriction particulière"], correct: 1, exp: "Seul un personnel formé et autorisé peut conduire un engin de levage, pour limiter les risques de manœuvre." },
      { q: "Pour un produit chimique dangereux utilisé sur chantier, le document devant être tenu à disposition est :", opts: ["Aucun document particulier", "La fiche de données de sécurité (FDS)", "Le ticket de caisse de l'achat", "Le manuel du camion de livraison"], correct: 1, exp: "La FDS renseigne sur les dangers du produit et les précautions à respecter." },
      { q: "Face à un bruit intense et prolongé sur chantier, la mesure de prévention adaptée est :", opts: ["L'ignorer si l'exposition est courte", "Porter une protection auditive individuelle et réduire le bruit à la source si possible", "Augmenter le volume de la radio pour couvrir le bruit", "Aucune action n'est requise"], correct: 1, exp: "La protection auditive et la réduction du bruit à la source préviennent les atteintes auditives durables." },
      { q: "L'exposition répétée à la poussière de silice (perçage, meulage de béton) expose à un risque de :", opts: ["Aucun risque connu", "Maladie respiratoire (silicose), pouvant être reconnue comme maladie professionnelle", "Amélioration de la vision", "Risque uniquement esthétique"], correct: 1, exp: "Le Décret n°2013-554 du 5 août 2013 fixe la liste des maladies professionnelles indemnisables en Côte d'Ivoire, en cohérence avec la Loi n°99-477." },
      { q: "L'ordre et la propreté du chantier (méthode dite « 5S ») contribuent à la sécurité car ils :", opts: ["Ont un rôle uniquement esthétique", "Réduisent les risques de chute, de trébuchement et facilitent l'évacuation", "Sont sans lien avec la sécurité", "Ne concernent que les bureaux"], correct: 1, exp: "Un chantier ordonné limite les obstacles au sol, source fréquente de chutes." },
      { q: "La trousse de premiers secours sur un chantier doit être :", opts: ["Facultative", "Présente, accessible, et son contenu vérifié régulièrement", "Réservée aux chantiers de plus de 100 personnes", "Remplacée par un téléphone portable"], correct: 1, exp: "Une trousse disponible et à jour permet une première prise en charge rapide en cas de blessure." },
      { q: "Face à un danger grave et imminent, un salarié peut-il se retirer de la situation de travail ?", opts: ["Non, jamais", "Oui, sans que cela constitue une faute, sous réserve d'un motif raisonnable", "Uniquement avec l'accord écrit préalable de l'employeur", "Seulement s'il est cadre"], correct: 1, exp: "Le Décret n°2020-956 du 9 décembre 2020 (art. 2 et 7) reconnaît ce droit de retrait : aucune sanction ni retenue de salaire ne peut être prise si le travailleur avait un motif raisonnable de penser à un danger grave et imminent." },
      { q: "L'accueil sécurité lors de l'arrivée sur un nouveau chantier doit être délivré à :", opts: ["Uniquement aux nouveaux embauchés en CDI", "Tout travailleur intervenant sur le site, y compris intérimaires et sous-traitants", "Uniquement aux chefs d'équipe", "Personne, l'expérience suffit"], correct: 1, exp: "L'accueil sécurité doit informer tout intervenant, quel que soit son statut, des risques du site." },
      { q: "La norme internationale de référence pour un système de management de la santé et sécurité au travail est :", opts: ["ISO 9001", "ISO 45001", "ISO 14001", "ISO 26000"], correct: 1, exp: "L'ISO 45001:2018 est la norme internationale de référence pour les systèmes de management SST." },
      { q: "Un incident ou « presque-accident » (sans blessure) sur chantier doit-il être signalé ?", opts: ["Non, seul un accident avec blessure compte", "Oui, le signalement permet d'identifier et de corriger une situation dangereuse avant qu'un accident ne survienne", "Uniquement si un client est présent", "Seulement dans un rapport de fin de mois"], correct: 1, exp: "Le signalement des presque-accidents permet une prévention avant qu'un véritable accident ne survienne." }
    ]
  },
  route: {
    code: 'ROU',
    title: "Déplacements et conduite en mission",
    description: "Conduite, chargement et sécurité routière en mission.",
    questions: [
      { q: "Avant de prendre le volant d'un véhicule de service, le conducteur doit vérifier :", opts: ["Rien, le véhicule est entretenu par l'entreprise", "La validité de son permis adapté au véhicule, ainsi que l'état général du véhicule (pneus, freins, niveaux)", "Seulement le niveau de carburant", "Uniquement la présence de la carte grise"], correct: 1, exp: "Une vérification préalable du permis et de l'état du véhicule prévient de nombreux incidents évitables." },
      { q: "Le port de la ceinture de sécurité en Côte d'Ivoire est :", opts: ["Facultatif en agglomération", "Obligatoire pour tous les occupants du véhicule et sanctionné en cas de non-respect", "Obligatoire uniquement pour le conducteur", "Réservé aux longs trajets"], correct: 1, exp: "Le non-port de la ceinture est sanctionné depuis le Décret n°2022-631 du 3 août 2022, modifiant le Décret n°2016-864 réglementant l'usage des voies routières." },
      { q: "Utiliser son téléphone tenu en main en conduisant :", opts: ["Est toléré à faible vitesse", "Est strictement interdit et sanctionné, car source majeure de distraction", "Est autorisé pour les appels professionnels urgents", "N'est pas réglementé"], correct: 1, exp: "L'usage du téléphone au volant figure parmi les infractions sanctionnées par le Décret n°2022-631 du 3 août 2022." },
      { q: "La vitesse maximale autorisée en agglomération pour un véhicule léger en Côte d'Ivoire est généralement de :", opts: ["90 km/h", "50 km/h", "120 km/h", "Aucune limite"], correct: 1, exp: "Limite rappelée par le Ministère des Transports ivoirien ; les limites hors agglomération sont plus élevées selon le type de voie et de véhicule." },
      { q: "Conduire après avoir consommé de l'alcool :", opts: ["Est autorisé si « juste un verre »", "Constitue une infraction passible de sanctions (suspension du permis, amende) ; la politique de sécurité en mission recommande une tolérance zéro", "N'est un problème que la nuit", "Est sans conséquence si le trajet est court"], correct: 1, exp: "L'alcool au volant est une infraction sanctionnée et une cause majeure d'accidents graves." },
      { q: "Le système de « permis à points » instauré en Côte d'Ivoire :", opts: ["N'existe pas", "Attribue un capital de points réduit à chaque infraction, pouvant conduire au retrait du permis en cas d'épuisement", "Concerne uniquement les chauffeurs professionnels", "Se reconstitue indéfiniment sans condition"], correct: 1, exp: "Mécanisme introduit par le Décret n°2022-631 du 3 août 2022 modifiant la réglementation de la circulation routière." },
      { q: "En cas de fatigue au volant lors d'une mission longue distance, il faut :", opts: ["Continuer à rouler, la mission étant prioritaire", "S'arrêter dès que possible pour se reposer, la fatigue multipliant le risque d'accident", "Ouvrir la fenêtre, ce qui suffit toujours", "Boire du café à la place du repos"], correct: 1, exp: "Seule une vraie pause permet de récupérer la vigilance nécessaire à une conduite sûre." },
      { q: "Le chargement d'un véhicule utilitaire en mission doit être :", opts: ["Réparti sans contrainte particulière", "Arrimé et réparti de façon à ne pas dépasser le poids autorisé ni déséquilibrer le véhicule", "Toujours placé uniquement à l'arrière", "Sans limite de poids si le trajet est court"], correct: 1, exp: "Un chargement mal réparti ou trop lourd déstabilise le véhicule et augmente le risque d'accident." },
      { q: "Parmi les équipements devant être présents à bord d'un véhicule en Côte d'Ivoire figurent notamment :", opts: ["Rien de spécifique", "Triangle de signalisation, gilet réfléchissant et extincteur en état de fonctionnement", "Uniquement une trousse à outils", "Un parapluie"], correct: 1, exp: "Ces équipements de sécurité doivent être présents et fonctionnels dans le véhicule." },
      { q: "Pour un déplacement en moto ou tricycle dans le cadre d'une mission de terrain :", opts: ["Le casque est optionnel sur courte distance", "Le port d'un casque homologué est une protection essentielle et une obligation", "Seul le passager doit porter un casque", "Le casque nuit à la visibilité"], correct: 1, exp: "Le casque homologué protège la tête, partie la plus vulnérable en cas de chute à moto." },
      { q: "Les documents à avoir systématiquement lors d'un déplacement professionnel comprennent :", opts: ["Aucun document particulier", "Permis de conduire valide, carte grise, attestation d'assurance et, le cas échéant, ordre de mission", "Seulement une pièce d'identité", "Uniquement le contrat de travail"], correct: 1, exp: "Ces documents doivent pouvoir être présentés à tout contrôle routier." },
      { q: "En cas de forte pluie pendant un trajet, il convient de :", opts: ["Maintenir la même vitesse qu'habituellement", "Réduire la vitesse et augmenter les distances de sécurité", "Couper les phares pour économiser la batterie", "Considérer que cela ne change rien"], correct: 1, exp: "La pluie réduit l'adhérence et la visibilité ; il faut adapter sa conduite en conséquence." },
      { q: "Le transport de matières ou produits dangereux (carburant, produits chimiques) en mission :", opts: ["Se fait comme n'importe quelle marchandise", "Doit respecter des règles de conditionnement, de signalisation et de formation du conducteur, inspirées des standards internationaux de transport de matières dangereuses", "Est interdit dans tous les cas", "Ne nécessite aucune précaution particulière"], correct: 1, exp: "Le transport de matières dangereuses impose un conditionnement, une signalisation et une formation spécifiques." },
      { q: "En cas d'accident de la route pendant une mission professionnelle, le salarié doit :", opts: ["Ne rien signaler pour éviter les complications", "Sécuriser les lieux, porter secours si possible, et informer rapidement son employeur en vue d'une éventuelle déclaration d'accident du travail", "Attendre son retour au bureau pour en parler", "Réparer seul le véhicule sans en parler"], correct: 1, exp: "Un accident survenu en mission professionnelle peut être qualifié d'accident du travail au sens de la Loi n°99-477." },
      { q: "Le contrôle technique du véhicule utilisé en mission :", opts: ["N'est pas nécessaire", "Doit être à jour, afin de garantir que le véhicule est apte à circuler en sécurité", "Concerne uniquement les véhicules de plus de 10 ans", "Est remplacé par un lavage régulier"], correct: 1, exp: "Un contrôle technique à jour garantit que le véhicule est apte à circuler en toute sécurité." },
      { q: "Face à un contrôle routier, l'attitude à adopter est de :", opts: ["Accélérer pour l'éviter", "Ralentir, s'arrêter et présenter calmement les documents demandés", "Klaxonner pour signaler son passage", "Faire demi-tour brusquement"], correct: 1, exp: "S'arrêter calmement et présenter ses documents évite tout risque et toute infraction supplémentaire." },
      { q: "L'usage du GPS ou d'une application de navigation pendant la conduite :", opts: ["Est sans risque", "Doit être configuré avant le départ pour limiter la distraction pendant la conduite", "Peut être manipulé en roulant pour gagner du temps", "Est interdit même à l'arrêt"], correct: 1, exp: "Configurer le GPS avant de partir évite toute manipulation distrayante en roulant." },
      { q: "Un objectif porté au niveau international en matière de sécurité routière (Décennie d'action des Nations Unies) est de :", opts: ["Augmenter le nombre de véhicules en circulation", "Réduire significativement le nombre de morts et de blessés sur les routes", "Supprimer les règles de circulation", "Favoriser la vitesse"], correct: 1, exp: "La Décennie d'action des Nations Unies vise à réduire fortement la mortalité routière mondiale." },
      { q: "En cas de doute sur son aptitude à conduire (fatigue, somnolence) avant un départ en mission :", opts: ["Le salarié doit conduire quand même pour respecter le planning", "Le salarié peut et doit alerter sa hiérarchie et différer le départ si nécessaire", "C'est uniquement à l'employeur de décider, sans consultation", "Il n'existe aucune procédure à ce sujet"], correct: 1, exp: "La sécurité prime sur le respect strict du planning ; tout doute doit être signalé avant de prendre la route." },
      { q: "Le respect du code de la route pendant une mission relève :", opts: ["Uniquement de la responsabilité personnelle du salarié", "D'une responsabilité partagée : le salarié respecte la réglementation, et l'employeur organise des missions réalistes en temps et en charge de travail", "De la responsabilité exclusive de l'employeur", "D'aucune responsabilité clairement établie"], correct: 1, exp: "La sécurité routière en mission est une responsabilité partagée entre salarié et employeur." }
    ]
  },
  ergonomie: {
    code: 'ERG',
    title: "Ergonomie et travail sur écran",
    description: "Poste de travail, écran et prévention des TMS au bureau.",
    questions: [
      { q: "La hauteur idéale de l'écran par rapport aux yeux est telle que :", opts: ["L'écran doit être nettement plus haut que les yeux", "Le haut de l'écran se situe à hauteur des yeux ou légèrement en dessous", "Seule la luminosité importe", "L'écran doit être posé à même le bureau sans support"], correct: 1, exp: "Recommandation issue des bonnes pratiques ergonomiques internationales de la série de normes ISO 9241." },
      { q: "La distance recommandée entre les yeux et l'écran est d'environ :", opts: ["10 cm", "50 à 70 cm (longueur du bras)", "Peu importe", "Minimum 2 mètres"], correct: 1, exp: "Cette distance limite la fatigue oculaire tout en permettant une bonne lecture de l'écran." },
      { q: "Il est recommandé de faire des pauses visuelles régulières devant un écran, par exemple selon le principe :", opts: ["Ne jamais faire de pause, cela nuirait à la productivité", "Toutes les 20 minutes, regarder au loin quelques secondes (règle dite « 20-20-20 »)", "Une seule fois par jour suffit", "Uniquement en fin de journée"], correct: 1, exp: "Cette pause visuelle régulière réduit la fatigue oculaire liée au travail sur écran." },
      { q: "Un siège de bureau ergonomique doit permettre notamment :", opts: ["Uniquement de s'asseoir", "Le réglage de la hauteur, de l'inclinaison du dossier et un bon soutien lombaire", "D'être fixe et non réglable", "D'être en métal sans assise rembourrée"], correct: 1, exp: "Ces réglages permettent d'adapter le siège à chaque utilisateur et de préserver le dos." },
      { q: "Pendant la frappe au clavier, les avant-bras et poignets doivent être :", opts: ["Fortement fléchis vers le haut en permanence", "Dans une position neutre et alignée, pour limiter les tensions", "Suspendus dans le vide sans appui", "Croisés"], correct: 1, exp: "Une position neutre des poignets limite les tensions et le risque de TMS." },
      { q: "Les troubles musculo-squelettiques (TMS) liés au travail sur écran :", opts: ["N'ont aucune existence légale", "Peuvent, selon les cas, être reconnus comme maladies professionnelles indemnisables", "Ne concernent que les sportifs", "Sont sans lien avec la posture de travail"], correct: 1, exp: "Le Décret n°2013-554 du 5 août 2013 fixe la liste des maladies professionnelles indemnisables en Côte d'Ivoire." },
      { q: "L'éclairage du poste de travail doit être positionné de façon à :", opts: ["Créer un reflet direct sur l'écran", "Éviter les reflets et l'éblouissement, l'écran étant idéalement placé perpendiculairement aux fenêtres", "Toujours être orienté face à l'écran", "Rester éteint en permanence"], correct: 1, exp: "Un éclairage mal orienté génère reflets et éblouissement, sources de fatigue visuelle." },
      { q: "Concernant l'aménagement des postes de travail, l'employeur :", opts: ["N'a aucune obligation particulière", "A une obligation générale d'assurer la sécurité et la santé des travailleurs, incluant l'adaptation raisonnable du poste", "Laisse au seul salarié le soin d'acheter son mobilier", "N'est concerné que dans les grandes entreprises"], correct: 1, exp: "Obligation générale de sécurité de l'employeur (Code du travail, art. 41.1 à 41.8), complétée par la convention OIT n°155." },
      { q: "En position assise au bureau, les pieds doivent être :", opts: ["Suspendus, sans appui", "Posés à plat au sol ou sur un repose-pieds", "Croisés en permanence", "Dans une position indifférente"], correct: 1, exp: "Cette position soulage le bas du dos et favorise une bonne circulation sanguine." },
      { q: "L'utilisation de deux écrans nécessite :", opts: ["Aucun ajustement particulier", "Un positionnement réfléchi (écran principal en face, secondaire à côté) pour limiter les torsions répétées du cou", "De superposer les deux écrans", "D'utiliser un œil différent pour chaque écran"], correct: 1, exp: "Un bon positionnement des écrans évite les torsions répétées du cou, source de tensions cervicales." },
      { q: "En télétravail, les principes d'ergonomie du poste de travail :", opts: ["Ne s'appliquent plus", "Restent recommandés pour prévenir les mêmes risques de TMS qu'au bureau", "Sont remplacés par le seul confort personnel", "Ne concernent que le matériel fourni par l'entreprise"], correct: 1, exp: "Les mêmes principes ergonomiques s'appliquent au poste de télétravail pour prévenir les TMS." },
      { q: "Travailler plus de 4 à 6 heures en continu, sans réelle interruption, devant un écran :", opts: ["Est recommandé pour la concentration", "Augmente le risque de fatigue visuelle et de TMS ; des pauses régulières sont nécessaires", "N'a aucun effet", "Est une obligation légale"], correct: 1, exp: "Un travail continu prolongé sur écran augmente la fatigue visuelle et musculaire." },
      { q: "La souris d'ordinateur doit être utilisée avec :", opts: ["Un mouvement uniquement du poignet fortement fléchi", "Le bras et le poignet dans une position neutre, la souris placée près du clavier", "Le bras totalement tendu en permanence", "Une position indifférente"], correct: 1, exp: "Une position neutre du bras et du poignet limite les tensions liées à l'usage prolongé de la souris." },
      { q: "La tension au poignet liée à l'usage prolongé de la souris peut être prévenue par :", opts: ["Une utilisation intensive sans pause", "Des pauses régulières, un repose-poignet adapté et une position neutre du poignet", "L'absence de toute mesure", "Le port de gants épais en permanence"], correct: 1, exp: "Ces mesures réduisent le risque de troubles comme le syndrome du canal carpien." },
      { q: "Concernant la correction visuelle pour le travail sur écran :", opts: ["Elle est sans importance", "Une correction visuelle adaptée contribue à réduire la fatigue oculaire", "Il est toujours interdit de porter des lunettes au bureau", "Cela ne concerne que les personnes de plus de 60 ans"], correct: 1, exp: "Une bonne correction visuelle limite l'effort d'accommodation et la fatigue oculaire." },
      { q: "La norme internationale ISO 9241 porte notamment sur :", opts: ["La gestion financière des entreprises", "Les exigences ergonomiques pour le travail de bureau avec écrans de visualisation", "La sécurité incendie", "Le transport de marchandises"], correct: 1, exp: "L'ISO 9241 est la référence internationale pour l'ergonomie du travail sur écran." },
      { q: "La directive européenne 90/270/CEE, souvent citée comme référence de bonne pratique pour le travail sur écran, porte sur :", opts: ["La protection des données personnelles", "Les prescriptions minimales de sécurité et de santé relatives au travail sur des équipements à écran de visualisation", "Le temps de travail", "La fiscalité des entreprises"], correct: 1, exp: "Cette directive fixe des prescriptions minimales pour le travail sur écran, référence de bonne pratique." },
      { q: "Un mobilier de bureau ajustable (chaise, hauteur de bureau) permet notamment :", opts: ["Un gain uniquement esthétique", "D'adapter le poste à chaque utilisateur et de réduire les contraintes posturales", "De réduire les coûts d'électricité", "Rien de particulier"], correct: 1, exp: "Un mobilier ajustable permet d'adapter le poste à la morphologie de chaque utilisateur." },
      { q: "Des exercices d'étirement réguliers au poste de travail (cou, épaules, poignets) :", opts: ["Sont inutiles", "Aident à prévenir les tensions musculaires liées à la position statique prolongée", "Sont réservés aux sportifs professionnels", "Augmentent le risque de blessure"], correct: 1, exp: "Ces étirements réguliers relâchent les tensions accumulées par la position statique prolongée." },
      { q: "Si un salarié ressent des douleurs persistantes liées à son poste de travail sur écran, il doit :", opts: ["Ne rien dire et continuer", "En informer son employeur et/ou le service de santé au travail pour une évaluation du poste", "Changer d'emploi immédiatement", "Attendre que la douleur disparaisse seule"], correct: 1, exp: "Rôle des services de santé au travail prévu par les art. 43.1 à 43.4 du Code du travail ivoirien." }
    ]
  },
  isole: {
    code: 'ISO',
    title: "Travail isolé et milieu naturel",
    description: "Autonomie, alerte et prévention en milieu naturel ou forestier.",
    questions: [
      { q: "On parle de « travail isolé » lorsqu'un travailleur :", opts: ["Se trouve seul dans un bureau climatisé sans risque particulier", "Exécute une tâche seul, hors de la vue et de portée de voix de personnes pouvant lui porter secours rapidement", "Travaille en musique", "Change simplement d'équipe"], correct: 1, exp: "Le travail isolé se définit par l'absence de secours à proximité immédiate en cas d'incident." },
      { q: "Avant une mission seul en forêt ou en zone isolée, il est recommandé de :", opts: ["Partir sans prévenir personne pour gagner du temps", "Communiquer son itinéraire prévu et l'heure de retour estimée à un référent", "Éteindre son téléphone pour ne pas être dérangé", "Improviser le trajet sur place"], correct: 1, exp: "Cette communication permet de déclencher une alerte en cas de retard anormal." },
      { q: "Un dispositif d'alarme pour travailleur isolé (DATI) permet notamment de :", opts: ["Écouter de la musique", "Déclencher une alerte automatique en cas de chute, d'immobilité prolongée ou d'appui manuel en situation d'urgence", "Remplacer le casque de chantier", "Naviguer sur internet"], correct: 1, exp: "Le DATI détecte l'absence de mouvement ou permet une alerte manuelle en cas d'urgence." },
      { q: "En cas de perte de réseau téléphonique en milieu isolé, il convient de :", opts: ["Continuer sans précaution supplémentaire", "Prévoir un point de contact régulier prédéfini et des moyens de communication alternatifs (radio, balise satellite)", "Rester bloqué faute de solution", "Considérer que le risque n'existe plus"], correct: 1, exp: "Des moyens alternatifs de communication compensent l'absence de réseau téléphonique." },
      { q: "Face à une intempérie violente (orage, forte pluie) en mission en milieu naturel :", opts: ["Il faut continuer la mission coûte que coûte", "Il faut interrompre l'activité et se mettre à l'abri en sécurité", "Il faut chercher un arbre isolé pour s'abriter en priorité", "Les alertes météo peuvent être ignorées"], correct: 1, exp: "La sécurité impose d'interrompre l'activité et de se mettre à l'abri en cas d'intempérie violente." },
      { q: "Face à un animal potentiellement dangereux (serpent, etc.) rencontré sur le terrain, il faut :", opts: ["S'approcher pour l'observer ou le photographier", "Garder ses distances, ne pas le provoquer et s'éloigner calmement", "Le capturer immédiatement", "Courir en criant"], correct: 1, exp: "Un mouvement brusque peut provoquer une réaction agressive ; il faut s'éloigner calmement." },
      { q: "L'hydratation régulière en mission de terrain, sous climat chaud et humide, est :", opts: ["Non prioritaire", "Essentielle pour prévenir la déshydratation et les coups de chaleur", "À limiter pour éviter les pauses", "Une question réservée aux sportifs"], correct: 1, exp: "Une hydratation régulière prévient la déshydratation et le coup de chaleur en climat chaud et humide." },
      { q: "Les tenues adaptées au travail en milieu naturel ou forestier (manches longues, bottes) servent notamment à :", opts: ["Suivre un effet de mode", "Se protéger des piqûres, morsures, coupures et de la végétation", "N'ont pas d'utilité particulière", "Se protéger uniquement du soleil"], correct: 1, exp: "Une tenue couvrante protège contre la végétation, les insectes et les petites blessures." },
      { q: "Le risque de paludisme (transmis par les moustiques) lors de missions en zone naturelle doit être prévenu par :", opts: ["Aucune mesure particulière", "Des mesures de protection individuelle (répulsifs, vêtements couvrants) et un suivi médical adapté", "Une vigilance uniquement en saison sèche", "Le port d'un casque"], correct: 1, exp: "La prévention du paludisme repose sur la protection individuelle et un suivi médical adapté." },
      { q: "La trousse de premiers secours emportée en mission isolée doit être :", opts: ["Facultative", "Présente, adaptée aux risques du terrain, et son contenu vérifié avant chaque départ", "Réservée aux missions de plus d'une semaine", "Remplacée par un simple mouchoir"], correct: 1, exp: "Une trousse vérifiée avant chaque départ garantit une première prise en charge efficace." },
      { q: "Travailler en binôme plutôt que seul, en zone à risque élevé, permet notamment de :", opts: ["Simplement discuter davantage", "Assurer une surveillance mutuelle et une capacité d'alerte ou de secours en cas d'incident", "Ralentir le travail sans autre bénéfice", "Éviter uniquement l'ennui"], correct: 1, exp: "Le travail en binôme permet une surveillance mutuelle et une alerte rapide en cas d'incident." },
      { q: "En cas d'accident lors d'une mission en milieu isolé, la priorité est de :", opts: ["Continuer le travail prévu", "Sécuriser la zone, alerter les secours ou le référent, et porter assistance dans la limite de ses compétences", "Attendre le retour au bureau pour signaler l'incident", "Ne rien faire en attendant une consigne écrite"], correct: 1, exp: "La priorité est de sécuriser, alerter et porter assistance dans la limite de ses compétences." },
      { q: "Concernant les feux de brousse en zone naturelle, un travailleur doit :", opts: ["Les ignorer s'ils semblent loin", "Rester attentif aux signes (fumée, odeur), s'éloigner et alerter en cas de départ de feu détecté", "Chercher systématiquement à l'éteindre seul", "Aucune vigilance n'est nécessaire"], correct: 1, exp: "La vigilance et l'alerte rapide priment sur une intervention seule face à un feu de brousse." },
      { q: "Un coup de chaleur se manifeste notamment par :", opts: ["Une sensation de froid intense", "Une température corporelle élevée, des maux de tête et une possible confusion, nécessitant une prise en charge rapide", "Une amélioration soudaine de la concentration", "Aucun symptôme visible"], correct: 1, exp: "Ces symptômes nécessitent une prise en charge rapide pour éviter une aggravation." },
      { q: "L'orientation sur le terrain (GPS, carte, boussole) en milieu naturel isolé est importante car elle :", opts: ["Est sans utilité si l'on connaît la zone", "Permet d'éviter de se perdre et de faciliter une éventuelle intervention de secours", "Ne fait que ralentir le déplacement", "Ne concerne que les activités de loisir"], correct: 1, exp: "Une bonne orientation évite de se perdre et facilite une intervention de secours si besoin." },
      { q: "La proximité de lignes électriques ou d'infrastructures en zone naturelle ou forestière impose :", opts: ["Aucune précaution particulière", "Une vigilance accrue et le respect des distances de sécurité recommandées", "De toucher les câbles pour vérifier s'ils sont sous tension", "De les couper soi-même en cas de doute"], correct: 1, exp: "Le respect des distances de sécurité prévient tout risque d'électrocution." },
      { q: "Concernant l'obligation générale de sécurité en Côte d'Ivoire, applicable aussi aux travailleurs isolés ou en milieu naturel :", opts: ["Elle ne s'applique pas en dehors des locaux de l'entreprise", "L'employeur reste tenu d'évaluer les risques et de prendre les mesures nécessaires, y compris pour les missions en extérieur", "La sécurité devient uniquement la responsabilité personnelle du salarié hors des locaux", "Aucun texte ne couvre cette situation"], correct: 1, exp: "Art. 41.1 à 41.8 du Code du travail (Loi n°2015-532), complétés par la convention OIT n°155 ratifiée par la Côte d'Ivoire en 2015." },
      { q: "Pour les travailleurs du secteur agricole ou forestier, une convention internationale de référence en matière de sécurité et santé est :", opts: ["La convention OIT n°184 sur la sécurité et la santé dans l'agriculture", "La convention sur le droit de la mer", "La convention sur les droits d'auteur", "Aucune convention n'existe sur ce sujet"], correct: 0, exp: "La convention OIT n°184 (2001) est la référence internationale en santé-sécurité pour le secteur agricole et forestier." },
      { q: "Le Code forestier ivoirien (Loi n°2019-675 du 23 juillet 2019) encadre notamment :", opts: ["Uniquement la fiscalité du bois", "L'exploitation et la protection des ressources forestières, avec des obligations pour les acteurs intervenant en milieu forestier", "Le code de la route", "Le travail sur écran"], correct: 1, exp: "La Loi n°2019-675 encadre l'exploitation et la protection des ressources forestières en Côte d'Ivoire." },
      { q: "Avant de clore une mission en milieu isolé, il est recommandé de :", opts: ["Partir sans prévenir", "Confirmer son retour ou la fin de sa mission auprès du référent désigné, afin de clore le suivi de sécurité", "Ne rien signaler, cela n'a pas d'importance", "Attendre le lendemain pour informer"], correct: 1, exp: "Confirmer son retour clôture le suivi de sécurité initié avant le départ en mission." }
    ]
  }
};

export const MONTHS = [
  { id: 1, name: "Janvier", theme: "Bilan & Prévention des Accidents", icon: "📊", color: "#3498DB",
    presentation: "Le début d'année est le moment idéal pour dresser un bilan de la sécurité de l'année écoulée et fixer de nouveaux objectifs. La prévention des accidents repose sur l'analyse des incidents passés et l'engagement collectif de tous les salariés.",
    importance: "Les accidents du travail coûtent cher en termes humains et économiques. Une bonne culture de prévention réduit les arrêts de travail, améliore la qualité de vie au travail et renforce la performance globale de l'entreprise.",
    risques: ["Répétition des mêmes accidents faute de retour d'expérience", "Perte de vigilance après une longue période sans incident", "Non-conformité aux réglementations en vigueur", "Dégradation des conditions de travail sans plan d'action"],
    goldenRule: "« Un accident de travail peut être évité. La prévention commence par chacun d'entre nous ! »",
    instructions: [
      { title: "Analyser les incidents passés", text: "Participez aux retours d'expérience sur les accidents, les presque-accidents et les incidents" },
      { title: "Fixer des objectifs sécurité", text: "Contribuez aux objectifs de votre équipe : le bilan de l'année écoulée et le programme de prévention sont présentés au CSST avant la fin du premier trimestre (décret n°2020-955, art. 15)" },
      { title: "Vérifier son équipement", text: "Contrôlez l'état de vos EPI et équipements en début d'année" },
      { title: "Renouveler ses formations", text: "Mettez à jour vos formations et habilitations obligatoires" }
    ] },
  { id: 2, name: "Février", theme: "Équipements de Protection Individuelle (EPI)", icon: "🦺", color: "#E67E22",
    presentation: "Les Équipements de Protection Individuelle (EPI) sont des dispositifs portés par le salarié pour le protéger contre les risques susceptibles de menacer sa santé ou sa sécurité. Ils constituent le dernier rempart de protection lorsque les risques ne peuvent être supprimés à la source.",
    importance: "Le port des EPI est une obligation légale (Code du Travail). Un salarié correctement équipé réduit considérablement les risques de blessures graves. L'employeur a l'obligation de fournir les EPI adaptés et de former les salariés à leur utilisation.",
    risques: ["Blessures graves en cas de non-port des EPI obligatoires", "Utilisation d'EPI endommagés ou non conformes", "Port d'EPI inadaptés au risque réel du poste", "Inconfort lié au mauvais choix ou entretien des EPI"],
    goldenRule: "« Les EPI ne sont efficaces que s'ils sont portés correctement et en permanence sur les zones concernées. »",
    instructions: [
      { title: "Porter les EPI obligatoires", text: "Portez les équipements de protection individuelle adaptés à votre poste de travail" },
      { title: "Vérifier l'état de ses EPI", text: "Inspectez vos EPI avant chaque utilisation et signalez tout défaut à votre responsable" },
      { title: "Les conserver correctement", text: "Rangez vos EPI dans un endroit propre et sec après chaque utilisation" },
      { title: "Les remplacer si nécessaire", text: "N'hésitez pas à demander le remplacement d'un EPI endommagé ou arrivé en fin de vie" }
    ] },
  { id: 3, name: "Mars", theme: "Risques Chimiques", icon: "⚗️", color: "#9B59B6",
    presentation: "Les risques chimiques concernent l'exposition à des substances dangereuses pouvant affecter la santé par inhalation, contact cutané ou ingestion. Sur nos sites, de nombreux produits chimiques sont utilisés quotidiennement et nécessitent une vigilance particulière.",
    importance: "L'exposition aux produits chimiques peut provoquer des maladies professionnelles graves : cancers, maladies respiratoires, dermatoses. La réglementation impose une évaluation des risques chimiques et des mesures de prévention adaptées à chaque poste exposé.",
    risques: ["Inhalation de vapeurs, gaz ou poussières toxiques", "Contact cutané provoquant brûlures chimiques ou allergies", "Explosion ou incendie lors du stockage inadapté", "Pollution environnementale en cas de déversement accidentel"],
    goldenRule: "« Lisez toujours la Fiche de Données de Sécurité (FDS) avant de manipuler un produit chimique ! »",
    instructions: [
      { title: "Consulter les FDS", text: "Lisez systématiquement les Fiches de Données de Sécurité avant toute manipulation de produit" },
      { title: "Porter les EPI chimiques", text: "Gants, lunettes, masque respiratoire : portez les équipements spécifiques aux produits utilisés" },
      { title: "Stocker correctement", text: "Séparez les produits incompatibles et assurez une ventilation adéquate dans les zones de stockage" },
      { title: "Agir en cas d'accident", text: "En cas de contact, rincez abondamment et consultez immédiatement le médecin du travail" }
    ] },
  { id: 4, name: "Avril", theme: "Sécurité Incendie", icon: "🔥", color: "#E74C3C",
    presentation: "Le risque incendie est présent dans tout établissement. Un incendie peut se déclarer rapidement et se propager en quelques minutes. Connaître les procédures d'évacuation, savoir utiliser un extincteur et identifier les causes d'incendie sont des compétences essentielles pour chaque salarié.",
    importance: "L'incendie est l'une des catastrophes les plus meurtrières en entreprise. Une évacuation mal préparée peut coûter des vies. La prévention repose sur des exercices réguliers, des équipements de lutte contre l'incendie entretenus et des plans d'évacuation affichés.",
    risques: ["Défaut d'installation électrique ou court-circuit", "Stockage inadapté de matières inflammables", "Obstruction des issues de secours", "Absence de moyens de lutte (extincteurs périmés ou manquants)"],
    goldenRule: "« En cas d'incendie : Alerter → Évacuer → Rejoindre le point de rassemblement. Ne jamais prendre l'ascenseur ! »",
    instructions: [
      { title: "Localiser les extincteurs", text: "Repérez les extincteurs de votre zone et apprenez à les utiliser correctement" },
      { title: "Mémoriser les consignes d'évacuation", text: "Connaissez le plan d'évacuation et les issues de secours de votre bâtiment" },
      { title: "Garder les couloirs libres", text: "Ne jamais obstruer les couloirs et issues de secours — une vie peut en dépendre" },
      { title: "Participer aux exercices incendie", text: "Prenez les exercices d'évacuation au sérieux : ils préparent les bons réflexes et peuvent sauver des vies" }
    ] },
  { id: 5, name: "Mai", theme: "Risques Électriques", icon: "⚡", color: "#F39C12",
    presentation: "Le risque électrique est présent dans tous les secteurs d'activité. L'électricité est dangereuse car invisible et ses effets peuvent être immédiats et mortels. Seules les personnes habilitées peuvent intervenir sur les installations électriques.",
    importance: "Les accidents électriques provoquent des électrocutions, des brûlures graves et des incendies. Même une tension de 230V (tension domestique) peut être mortelle. Une habilitation électrique est obligatoire pour toute intervention sur les installations.",
    risques: ["Électrocution par contact direct avec une partie active", "Brûlures électriques et arc électrique", "Incendie provoqué par une installation défectueuse", "Explosion due à une atmosphère explosive en présence d'étincelles"],
    goldenRule: "« Ne jamais intervenir sur une installation électrique sans habilitation et sans consignation ! »",
    instructions: [
      { title: "Signaler les défauts électriques", text: "Tout câble endommagé, prise défectueuse ou tableau en mauvais état doit être signalé immédiatement" },
      { title: "Respecter les habilitations", text: "Seules les personnes habilitées peuvent intervenir sur les installations électriques" },
      { title: "Consigner avant intervention", text: "Toute intervention électrique nécessite une consignation préalable (coupure + verrouillage)" },
      { title: "Éloigner eau et électricité", text: "Ne jamais utiliser d'équipements électriques dans des zones humides sans protection adaptée" }
    ] },
  { id: 6, name: "Juin", theme: "Travail en Hauteur", icon: "🏗️", color: "#1ABC9C",
    presentation: "Le travail en hauteur désigne toute activité réalisée à une hauteur où une chute pourrait entraîner des blessures. C'est l'une des premières causes d'accidents mortels au travail. Échafaudages, toitures, échelles et nacelles sont les principales situations à risque.",
    importance: "Les chutes de hauteur représentent une part significative des accidents du travail graves et mortels. La réglementation impose des mesures de protection collectives prioritaires (garde-corps, filets) avant de recourir aux équipements individuels (harnais).",
    risques: ["Chute de hauteur pouvant être mortelle ou entraîner un handicap permanent", "Chute d'objets sur les travailleurs au sol", "Renversement ou glissement d'échelle mal positionnée", "Rupture d'équipement anti-chute mal entretenu"],
    goldenRule: "« Un harnais mal attaché ne protège pas. Vérifiez votre équipement avant chaque montée ! »",
    instructions: [
      { title: "Prioriser les protections collectives", text: "Utilisez en priorité les garde-corps, filets et plateformes avant de recourir au harnais" },
      { title: "Vérifier les équipements", text: "Inspectez systématiquement les équipements anti-chute avant chaque intervention en hauteur" },
      { title: "Sécuriser la zone au sol", text: "Délimitez la zone de travail en bas pour protéger les collègues des chutes d'objets" },
      { title: "Ne pas travailler seul", text: "Tout travail en hauteur doit être réalisé avec au moins un collègue présent pour surveiller" }
    ] },
  { id: 7, name: "Juillet", theme: "Prévention des TMS", icon: "💪", color: "#E67E22",
    presentation: "Les Troubles Musculo-Squelettiques (TMS) regroupent les affections des muscles, tendons, nerfs et articulations causées par des gestes répétitifs, des postures contraignantes ou des efforts excessifs. Ils touchent principalement le dos, les épaules, les poignets et les genoux.",
    importance: "Les TMS sont une cause importante de douleurs et d'arrêts de travail. Ils entraînent des douleurs chroniques, une limitation des mouvements et peuvent conduire à des incapacités permanentes affectant la vie professionnelle et personnelle.",
    risques: ["Gestes répétitifs effectués à cadence élevée sans pause", "Postures contraignantes maintenues longtemps", "Port de charges lourdes sans aide mécanique", "Ambiance froide, vibrations ou travail sous pression temporelle"],
    goldenRule: "« Un dos bien protégé aujourd'hui, c'est une carrière et une vie préservées pour demain ! »",
    instructions: [
      { title: "Adopter les bonnes postures", text: "Gardez le dos droit lors des manutentions, pliez les genoux et non le dos" },
      { title: "Utiliser les aides mécaniques", text: "Chariots, diables, transpalettes : utilisez les équipements disponibles pour limiter les efforts" },
      { title: "Alterner les tâches", text: "Évitez les postures prolongées en alternant les activités et en faisant des pauses régulières" },
      { title: "Consulter dès les premiers signes", text: "N'attendez pas que la douleur devienne chronique : consultez le médecin du travail dès les premiers signes" }
    ] },
  { id: 8, name: "Août", theme: "Chaleur & Exposition au Soleil", icon: "☀️", color: "#E74C3C",
    presentation: "Le climat chaud et humide représente un risque réel pour la santé des travailleurs, notamment pour ceux qui travaillent en extérieur ou dans des locaux non climatisés. Le coup de chaleur est une urgence médicale pouvant être fatale.",
    importance: "La forte chaleur favorise les accidents du travail (malaise, perte de vigilance, déshydratation). L'employeur assure l'eau potable sur les lieux et pendant les heures de travail (Code du travail, art. 41.6). Des pauses à l'ombre et des horaires adaptés sont aussi à prévoir, en particulier lors des missions de terrain.",
    risques: ["Coup de chaleur pouvant entraîner une défaillance organique", "Déshydratation réduisant la concentration et les réflexes", "Malaise et chute liés à une exposition prolongée au soleil", "Aggravation de maladies chroniques par la chaleur"],
    goldenRule: "« En période de forte chaleur, hydratez-vous régulièrement même sans avoir soif ! »",
    instructions: [
      { title: "S'hydrater régulièrement", text: "Buvez de l'eau régulièrement, sans attendre d'avoir soif, et davantage lors d'activités physiques ou en plein air" },
      { title: "Protéger sa peau", text: "Appliquez une crème solaire et portez un couvre-chef lors des travaux en extérieur" },
      { title: "Reconnaître les signes d'alerte", text: "Maux de tête, vertiges, fatigue intense : signes d'un coup de chaleur — alertez immédiatement" },
      { title: "Adapter les horaires", text: "Privilégiez les travaux intenses en début de journée et évitez les pics de chaleur (12h-16h)" }
    ] },
  { id: 9, name: "Septembre", theme: "Rentrée & Remise à Niveau Sécurité", icon: "🎯", color: "#27AE60",
    presentation: "La reprise d'activité après les congés et la rentrée scolaire nécessite une remise à niveau des réflexes de sécurité, tant au bureau que sur le terrain.",
    importance: "La vigilance diminue après une longue période d'absence, notamment lors des déplacements sur le terrain. Les nouveaux salariés doivent être accueillis et formés en matière de prévention.",
    risques: ["Perte des réflexes de sécurité pendant les congés, notamment lors des déplacements sur le terrain", "Accidents liés aux nouveaux stagiaires et salariés non encore formés aux consignes du cabinet", "Matériel topographique (GPS, stations totales, drones, véhicules) non vérifié depuis l'arrêt de l'activité", "Changements de procédures internes ou de consignes de sécurité non communiqués avant les congés"],
    goldenRule: "« La reprise d'activité est une période à risque, au bureau comme sur le terrain. Reprenez doucement, restez vigilants ! »",
    instructions: [
      { title: "Relire les procédures de sécurité", text: "Prenez le temps de relire les consignes du cabinet, notamment celles relatives aux missions de terrain" },
      { title: "Contrôler son matériel et son véhicule", text: "Vérifiez l'état de vos équipements et des véhicules avant tout déplacement sur le terrain" },
      { title: "Accueillir les nouveaux collègues", text: "Aidez les nouveaux salariés à connaître les consignes de sécurité du cabinet" },
      { title: "Mettre à jour ses formations", text: "Vérifiez la validité de vos habilitations ET certifications professionnelles" }
    ] },
  { id: 10, name: "Octobre", theme: "Mois de la Culture de Prévention", icon: "🛡️", color: "#2C3E50",
    presentation: "Octobre marque une étape intermédiaire dans l'année pour faire le point sur la culture de sécurité du cabinet. Cette démarche rejoint la culture de prévention promue par l'Organisation Internationale du Travail (OIT) et, en Côte d'Ivoire, par la CNPS.",
    importance: "La promotion d'une culture de prévention au sein du cabinet est un investissement durable. Une bonne politique de santé-sécurité augmente la productivité, réduit l'absentéisme et améliore l'image du cabinet auprès de ses collaborateurs, clients et partenaires.",
    risques: ["Défaut de culture de sécurité laissant des risques non identifiés, au bureau comme sur le terrain", "Manque de communication entre collaborateurs et direction sur les risques rencontrés en mission", "Risques émergents liés aux nouvelles technologies (drones, outils numériques de terrain)", "Isolement des géomètres et agents en déplacement, loin du cabinet, face aux risques"],
    goldenRule: "« La sécurité au travail est un droit fondamental. Défendons-le ensemble chaque jour ! »",
    instructions: [
      { title: "Participer aux actions de sensibilisation", text: "Engagez-vous dans les échanges internes organisés autour de la sécurité et de la santé au travail" },
      { title: "Partager les bonnes pratiques", text: "Échangez avec vos collègues vos expériences et bonnes pratiques, notamment lors des missions de terrain" },
      { title: "Identifier les risques émergents", text: "Participez aux évaluations des risques pour améliorer les conditions de travail au bureau et en mission" },
      { title: "Soutenir la culture de sécurité", text: "Encouragez vos collègues à adopter des comportements sécuritaires au quotidien, y compris lors des déplacements" }
    ] },
  { id: 11, name: "Novembre", theme: "Risques Routiers & Déplacements", icon: "🚗", color: "#E74C3C",
    presentation: "Le risque routier professionnel concerne tous les déplacements effectués dans le cadre du travail (trajets domicile-travail, missions, livraisons). Pistes dégradées, pluie, poussière et longues distances rendent ce risque particulièrement présent lors des missions de terrain.",
    importance: "Un accident de la route peut être très grave et, lorsqu'il survient en mission ou sur le trajet, il relève des accidents du travail ou de trajet. La prévention du risque routier doit donc être intégrée à l'organisation des déplacements professionnels.",
    risques: ["Vitesse excessive, principal facteur d'accidents mortels", "Usage du téléphone au volant, source majeure de distraction", "Fatigue et somnolence au volant, particulièrement en fin de journée", "Mauvaises conditions de circulation (pluie, poussière de l'harmattan, pistes dégradées)"],
    goldenRule: "« Au volant, aucune urgence professionnelle ne justifie de prendre des risques ! »",
    instructions: [
      { title: "Respecter scrupuleusement le Code de la Route", text: "Vitesse, alcool, téléphone : tolérance zéro, même lors des déplacements professionnels" },
      { title: "Préparer son véhicule", text: "Vérifiez l'état de votre véhicule (pneus, phares, essuie-glaces) avant chaque déplacement" },
      { title: "Planifier ses trajets", text: "Partez plus tôt si nécessaire — il vaut mieux prévenir d'un retard que de se précipiter" },
      { title: "Déclarer les accidents de trajet", text: "Informez immédiatement votre employeur : il dispose de 48 heures pour déclarer l'accident à la CNPS" }
    ] },
  { id: 12, name: "Décembre", theme: "Fatigue & Vigilance de Fin d'Année", icon: "🌟", color: "#8E44AD",
    presentation: "La fin d'année est souvent synonyme de fatigue accumulée, de pression liée aux objectifs et de relâchement de la vigilance, trois facteurs qui augmentent le risque d'accident.",
    importance: "La fatigue est un facteur aggravant de nombreux accidents du travail. Elle ralentit les réflexes, altère le jugement et réduit la capacité à percevoir les dangers. Il est essentiel de reconnaître ses propres limites et de signaler un état de fatigue extrême à son responsable.",
    risques: ["Accidents liés à une fatigue accumulée et une vigilance réduite", "Risques festifs : consommation d'alcool lors des événements de fin d'année", "Stress de fin d'année entraînant une prise de risques inconsidérée", "Relâchement des procédures de sécurité pour tenir les délais"],
    goldenRule: "« La fatigue est l'ennemie de la sécurité. Reposez-vous et prenez soin de vous et des autres ! »",
    instructions: [
      { title: "Gérer la fatigue", text: "Signalez à votre responsable si vous êtes trop fatigué pour travailler en sécurité" },
      { title: "Rester vigilant jusqu'au bout", text: "La fatigue de fin d'année réduit l'attention : maintenez vos réflexes de sécurité jusqu'au dernier jour" },
      { title: "Faire le bilan sécurité annuel", text: "Participez au bilan sécurité pour recenser les incidents et préparer l'année suivante" },
      { title: "Fêter en toute sécurité", text: "Après un événement de fin d'année, désignez un conducteur sobre ou utilisez les transports. La distribution d'alcool aux travailleurs dans l'entreprise est interdite (Code du travail, art. 41.6)" }
    ] }
];

export const EPI_LIST = [
  { label: 'Casque de chantier', icon: '<path d="M4 18v-1a8 8 0 0116 0v1"></path><path d="M2 18h20"></path><path d="M12 4v4"></path><path d="M9 4h6"></path>' },
  { label: 'Gilet haute visibilité', icon: '<path d="M8 4h2l2 2 2-2h2l2 3-2 2v11H6V9L4 7z"></path><path d="M10 4v4M14 4v4"></path>' },
  { label: 'Chaussures de sécurité', icon: '<path d="M4 21v-6a2 2 0 012-2h2l4-3 5 2h2a3 3 0 013 3v6z"></path><path d="M4 21h16"></path><path d="M9 13v3"></path>' },
  { label: 'Gants de protection', icon: '<path d="M7 22V11a2 2 0 114 0v3"></path><path d="M11 13V9a2 2 0 114 0v5"></path><path d="M15 14v-3a2 2 0 114 0v6a5 5 0 01-5 5H9a5 5 0 01-5-5v-3a2 2 0 114 0v1"></path>' },
  { label: 'Trousse de premiers secours', icon: '<rect x="3" y="8" width="18" height="12" rx="2"></rect><path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2"></path><path d="M12 12v4M10 14h4"></path>' },
  { label: "Téléphone / dispositif d'alerte chargé", icon: '<rect x="6" y="2" width="12" height="20" rx="2.5"></rect><path d="M10 5h4"></path><path d="M12 18v.01"></path>' },
  { label: 'Eau et protection solaire (terrain)', icon: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"></path>' },
  { label: 'Signalisation temporaire (voie publique)', icon: '<path d="M12 3l9 16H3z"></path><path d="M12 10v3"></path><circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none"></circle>' }
];

export const EMERGENCY_CONTACTS = [
  { zone: 'Voie publique / chantier', color: 'var(--color-accent)', iconBg: 'var(--color-accent-100)', iconColor: 'var(--color-accent-700)', entries: [
    { label: 'SAMU', number: '185' }, { label: 'Sapeurs-pompiers', number: '180' }, { label: 'Police secours', number: '110 / 111 / 170' }
  ] },
  { zone: 'Chantier BTP', color: 'var(--color-accent-2)', iconBg: 'var(--color-accent-2-100)', iconColor: 'var(--color-accent-2-700)', entries: [
    { label: 'Sapeurs-pompiers', number: '180' }, { label: 'Gendarmerie', number: '1110' }
  ] },
  { zone: 'Terrain naturel / forestier', color: '#1c2b3d', iconBg: 'var(--color-neutral-200)', iconColor: '#1c2b3d', entries: [
    { label: 'SAMU', number: '185' }, { label: 'Gendarmerie', number: '1110' }
  ] },
  { zone: "Bureau d'études", color: 'var(--color-neutral-500)', iconBg: 'var(--color-neutral-200)', iconColor: '#1c2b3d', entries: [
    { label: 'SAMU', number: '185' }, { label: 'Police secours', number: '110 / 111 / 170' }
  ] }
];

export const CIVIL_PROTECTION_CONTACTS = [
  { zone: 'Abidjan', number: '07 98 93 93 93' },
  { zone: 'Daloa', number: '07 17 42 42 42' },
  { zone: 'Bouaflé', number: '07 17 63 63 63' },
  { zone: 'Issia', number: '07 14 80 80 80' },
  { zone: 'Séguéla', number: '07 98 76 76 76' },
  { zone: 'Guiglo', number: '05 94 29 29 29' },
  { zone: 'GSPM Adjamé', number: '07 78 18 01 80' },
  { zone: 'GSPM Yakro', number: '01 01 22 18 17' }
];

export const QUIZ_ORDER = ['terrain', 'route', 'ergonomie', 'isole'];

export const MODULE_STYLE = {
  terrain: { color: '#E67E22', iconBg: '#fff1e3', iconColor: '#a84f0c', iconLetter: 'T' },
  route: { color: '#c0392b', iconBg: '#fbebeb', iconColor: '#c0392b', iconLetter: 'R' },
  ergonomie: { color: '#3498DB', iconBg: '#eaf2fa', iconColor: '#2c5f82', iconLetter: 'E' },
  isole: { color: '#27AE60', iconBg: '#eaf7ee', iconColor: '#1e8449', iconLetter: 'I' }
};

export const PASS_THRESHOLD = 70;