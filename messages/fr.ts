import en from "./en.json";

/**
 * French player-interface catalogue.
 *
 * Spreading each English namespace is a deliberate release-safety fallback:
 * adding a new English key cannot make the French game crash before translators
 * supply its wording. The localization test still verifies the final catalogue
 * shape, while the overrides below provide the shipped French experience.
 */
const fr = {
  ...en,
  Common: { ...en.Common, back: "Retour", cancel: "Annuler", check: "Vérifier", close: "Fermer", continue: "Continuer", locked: "Verrouillé", reset: "Réinitialiser", save: "Enregistrer", share: "Partager", tryAgain: "Réessayer", view: "Voir" },
  Navigation: { ...en.Navigation, home: "Accueil", map: "Carte", vault: "Bibliothèque", fellowships: "Communautés", shop: "Boutique", settings: "Paramètres", playerNavigation: "Navigation du joueur", desktopPlayerNavigation: "Navigation du joueur sur ordinateur", scriptureMemoHome: "Accueil de Scripture Memo", contextRail: "Informations et partenariat", partner: "Partenaire", becomePartner: "Devenir Partenaire", partnerDescription: "Aidez Scripture Memo à grandir et débloquez les cadres Partenaire.", learnMore: "En savoir plus", openingPartner: "Ouverture" },
  Settings: {
    ...en.Settings,
    player: "Joueur",
    chooseAvatar: "Choisissez votre compagnon de route",
    avatarDescription: "Choisissez lâ€™animal qui vous reprÃ©sentera dans le jeu.",
    selectAnimal: "Choisir {animal}",
    profileFrame: "Cadre du profil",
    partnerFrameDescription: "En tant que Partenaire, vous pouvez choisir nâ€™importe quel cadre.",
    standardFrameDescription: "Votre cadre standard reste disponible. Les cadres Partenaire sont accessibles aprÃ¨s avoir soutenu Scripture Memo.",
    partnerOnly: "Partenaire",
    selectFrame: "Choisir le cadre {frame}",
    animals: {
      lion: "Lion",
      dove: "Colombe",
      deer: "Cerf",
      bull: "Taureau",
      owl: "Hibou",
      donkey: "Ã‚ne",
      rabbit: "Lapin",
      fox: "Renard",
      panda: "Panda",
      elephant: "Ã‰lÃ©phant",
      giraffe: "Girafe",
      otter: "Loutre",
    },
    frames: {
      default: "Standard",
      gold: "Or",
      crystal: "Cristal violet",
      emerald: "Feuilles dâ€™Ã©meraude",
      silver: "Argent",
      flame: "Flamme",
      celestial: "CÃ©leste",
    },
    title: "Paramètres", eyebrow: "Votre compte", description: "Gérez votre identité, votre expérience biblique et vos préférences d’accessibilité.", profile: "Profil", displayName: "Nom affiché", displayNameDescription: "Affiché dans les classements et les groupes.", country: "Pays", notSelected: "Non sélectionné", selectCountry: "Choisissez votre pays", searchCountries: "Rechercher un pays…", noCountry: "Aucun pays ne correspond à votre recherche.", countryDescription: "Utilisé uniquement pour filtrer le classement par pays.", scriptureExperience: "Expérience biblique", interfaceLanguage: "Langue de l’interface", interfaceLanguageDescription: "Modifie les menus et les instructions du jeu. Votre traduction biblique reste indépendante.", english: "Anglais", spanish: "Espagnol", french: "Français", preferredBibleTranslation: "Traduction biblique préférée", theme: "Thème", light: "Clair", dark: "Sombre", system: "Utiliser le réglage du système", calendarTimezone: "Fuseau horaire du calendrier", timezoneDescription: "Détecté automatiquement. Modifiez-le si votre journée doit suivre un autre lieu.", audioEffects: "Effets sonores", audioDescription: "Jouer les sons pendant l’entraînement.", reducedMotion: "Animations réduites", motionDescription: "Réduire les animations non essentielles.", saveSettings: "Enregistrer les paramètres", savingSettings: "Enregistrement", saved: "Paramètres enregistrés.", checkHighlighted: "Vérifiez les paramètres signalés.", authRequired: "Authentification requise.", saveError: "Impossible d’enregistrer les paramètres. Réessayez.", journeyStats: "Statistiques de votre parcours", glowPoints: "Points de Lumière", waypoints: "Étapes", currentStreak: "Série actuelle", bestStreak: "Record : {count}", hintsUsed: "Indices utilisés"
  },
  Home: { ...en.Home, welcome: "Bienvenue, {name}", ready: "Votre compte est prêt.", openMap: "Ouvrir la carte du jeu", openVault: "Ouvrir la Bibliothèque", oilShop: "Boutique d’Huile", leaderboard: "Le Grand Phare", openingLeaderboard: "Ouverture du classement", currentStreak: "Série actuelle : {count} jours", loggingOut: "Déconnexion", logOut: "Se déconnecter" },
  Map: {
    ...en.Map,
    eyebrow: "Votre parcours biblique", title: "Suivez le chemin", description: "Terminez chaque défi de trois jours, allumez chaque flamme et débloquez l’étape suivante.", trail: "Sentier {number}", waypoints: "Étapes {start}–{end}", currentMap: "Carte actuelle", browseTrails: "Parcourir les sentiers", backToCurrent: "Revenir à la carte actuelle", currentWaypoint: "Étape actuelle", completedWaypoint: "Étape terminée", lockedWaypoint: "Étape verrouillée", openWaypoint: "Ouvrir l’étape {number}", emptyTitle: "Le sentier est en préparation", emptyDescription: "Aucune étape publiée n’est encore disponible.", comparison: "Comparaison des cartes", chooseMap: "Choisissez une carte", trailView: "Sentier", gridView: "Grille", completeWaypoint: "Terminez l’étape {number} pour la débloquer.", completePrevious: "Terminez l’étape précédente pour la débloquer.", continueHere: "CONTINUER ICI", waypointAria: "Étape {number}, {status}, {count} jours terminés sur 3", statuses: { LOCKED: "Verrouillée", UNLOCKED: "Prête", IN_PROGRESS: "En cours", COOLDOWN: "En attente", COMPLETED: "Terminée" }
  },
  DaySelection: {
    ...en.DaySelection,
    locked: "Verrouillé",
    backToMap: "Retour à la carte", waypoint: "Étape {number}", threeDayChallenge: "Défi de trois jours", chooseChallenge: "Choisissez le défi du jour", rewardPreview: "Aperçu de la récompense", glowPoints: "{points} Points de Lumière", ready: "Prêt", completed: "Terminé", cooldown: "Temps d’attente", startDay: "Commencer {day}", continueDay: "Continuer {day}", studyVerse: "Étudier le verset", adminUnlock: "Déblocage admin", glimmer: "Lueur", glow: "Éclat", radiance: "Radiance", glimmerSubtitle: "Début en douceur", glowSubtitle: "Souvenir grandissant", radianceSubtitle: "Souvenir complet", studyReopens: "L’étude rouvre après Radiance", stageRules: "Règles de l’étape", noHints: "Aucun indice disponible", memoryAlone: "Cette étape repose uniquement sur la mémoire.", timedChallenge: "Défi chronométré", flameKindled: "Flamme allumée", restFlame: "Laisser reposer la flamme", preparing: "Préparation de {day}", lunaKeepsPlace: "Luna garde votre place.", readyIn: "Prêt dans", unlocksIn: "{day} se débloque dans", preparingChallenge: "Préparation du défi", coolingDown: "Temps d’attente", timerUpdates: "Le minuteur se met à jour automatiquement.", unlocking: "Déblocage", unlockTesting: "Débloquer pour tester", testReplay: "Tester à nouveau {day}", challengeComplete: "Défi terminé"
  },
  Gameplay: {
    ...en.Gameplay,
    backToMap: "Retour à la carte", exit: "Quitter", actions: "Actions", sound: "Son", modeProgress: "Mode {current} sur {total}", adminTesting: "Test admin · aucune progression modifiée", replayMode: "Retester {mode}", dragDrop: "Glisser-déposer", puzzle: "Puzzle", swap: "Échange", cue: "Indice initial", fill: "Compléter", check: "Vérifier", reset: "Réinitialiser", wrongAnswer: "Pas tout à fait. Corrigez votre réponse et réessayez.", dragInstruction: "Faites glisser un mot, ou sélectionnez-le puis touchez un espace.", phraseInstruction: "Faites glisser une phrase, ou sélectionnez-la puis touchez une position libre.", swapInstruction: "Sélectionnez un mot surligné, puis un autre pour les échanger.", cueInstruction: "Saisissez chaque mot manquant à l’aide de sa première lettre.", fillInstruction: "Saisissez chaque mot manquant en entier.", wordBank: "Banque de mots", phraseBank: "Banque de phrases", hint: "Indice", hintsAvailable: "{count, plural, =0 {Aucun indice disponible} =1 {1 indice disponible} other {# indices disponibles}}", attemptExpired: "Temps écoulé", attemptExpiredBody: "Cette tentative est terminée, mais votre progression reste enregistrée.", retryMode: "Réessayer", vaultReplay: "Révision · Radiance", openMenu: "Ouvrir le menu du jeu", gameMenu: "Menu du jeu", on: "Activé", off: "Désactivé", exitGameplay: "Quitter la partie", progress: "Progression des modes", audioOn: "Sons activés pour cette session.", audioOff: "Sons coupés pour cette session.", returnCurrent: "Revenir au mode actuel", replayCompleted: "Rejouer un mode terminé", chooseCompleted: "Choisissez un mode terminé", timeRemaining: "Temps restant", upNext: "À suivre", dayComplete: "Journée terminée", minuteChallenge: "Défi de {minutes} minutes", clockStarts: "Le chrono démarre lorsque vous appuyez sur Commencer.", learnPace: "Apprenez à votre rythme", noTimer: "Ce défi n’est pas chronométré.", starting: "Démarrage…", beginMode: "Commencer {mode}", allWordsPlaced: "Tous les mots sont placés. Vérifiez votre réponse.", allPhrasesPlaced: "Toutes les phrases sont placées. Vérifiez l’ordre.", progressSafe: "Votre progression est enregistrée", tryModeAgain: "Réessayer {mode}", openingHint: "Ouverture de l’indice", noHintsRemaining: "Aucun indice restant", useHint: "Utiliser un indice · {count} restant(s)", lunaLight: "La lumière de Luna", hintEncouragement: "Lisez lentement. Vous en savez déjà plus que vous ne le pensez.", hintCloses: "Se ferme automatiquement après {seconds} secondes", checking: "Vérification", restoreMissing: "Replacez les mots manquants", restoreStructure: "Rétablissez la structure du verset", returnWords: "Remettez chaque mot à sa place", recallFirst: "Rappelez-vous grâce à la première lettre", completeMissing: "Complétez les mots manquants", howToSwap: "Comment échanger", firstLetterCue: "Indice de première lettre", fullRecall: "Rappel complet"
  },
  Completion: { ...en.Completion, beautifulWork: "Magnifique !", modeRestored: "Mode reconstitué", modeComplete: "{mode} terminé", dayComplete: "Tous les modes du défi du jour sont terminés.", glowEarned: "Points de Lumière gagnés", newBalance: "Nouveau solde : {balance}", nextMode: "Mode suivant", returnCurrent: "Revenir au mode actuel", adminReplay: "Test admin", testingComplete: "Test terminé. La progression et les récompenses n’ont pas changé.", waypointComplete: "Étape terminée !", threeFlames: "Les trois flammes brûlent.", waypointReward: "Récompense de l’étape", totalBalance: "Solde total", continueJourney: "Continuer le parcours", vaultReplay: "Révision", continueTo: "Continuer vers {mode}", returnVault: "Retour à la Bibliothèque", threeKindled: "Trois flammes allumées", waypointNumberComplete: "Étape {number} terminée !", waypointUnlocked: "L’étape {number} est maintenant débloquée.", caughtUp: "Vous avez rejoint le bout du sentier.", progressSaved: "Votre progression a été enregistrée.", waypointRewards: "Récompenses de l’étape", enterSanctuary: "Entrer dans le Sanctuaire", beaconXpEarned: "+{count} XP du Phare", beaconLevel: "Niveau du Phare {level}", beaconLevelProgress: "Progression vers le prochain niveau du Phare", levelUp: "Niveau supérieur ! Niveau du Phare {level}" },
  Streak: { ...en.Streak, dailyRhythm: "Rythme quotidien allumé", dayStreak: "Série de {count} jours !", keptAlive: "Vous êtes revenu et avez gardé la flamme allumée.", personalBest: "Nouveau record personnel", nextLevel: "Gardez votre série pour atteindre {level}.", comeBackTomorrow: "Revenez demain pour allumer la prochaine flamme.", shareStreak: "Partager la série", newLevel: "Nouveau niveau de série", freshRhythm: "Un nouveau rythme commence", nextStreakLevel: "Prochain niveau", daysRemaining: "{count, plural, =1 {1 jour restant} other {# jours restants}}", highestReached: "Niveau maximal atteint", previousBest: "Record précédent : {count} jours", newFlame: "Une nouvelle flamme commence aujourd’hui.", spark: "Étincelle", kindling: "Petit feu", steadyFlame: "Flamme stable", beacon: "Phare", blaze: "Brasier", inferno: "Enfer", supernova: "Supernova", eternalLightLevel: "Lumière éternelle" },
  Vault: { ...en.Vault, eyebrow: "Votre bibliothèque biblique", title: "La Bibliothèque", description: "Retrouvez les versets terminés, enregistrés ou maîtrisés.", mastered: "Maîtrisés", completed: "Terminés", favorites: "Favoris", inProgress: "En cours", allTranslations: "Toutes les traductions", allPacks: "Tous les recueils", hintsAvailable: "Indices disponibles", study: "Étudier", replay: "Rejouer", privateNote: "Note privée enregistrée", permanentCollection: "Votre collection permanente", returnTrail: "Retour au sentier", badgeCollection: "Collection d’insignes", waypoints: "Étapes", glowPoints: "Points de Lumière", currentStreak: "Série actuelle", bestStreak: "Meilleure série", hintsLeft: "Indices restants", summary: "Résumé de la Bibliothèque", favorite: "Favori", practiceInProgress: "Entraînement en cours", completedStages: "Étapes terminées", sanctuary: "Sanctuaire", studyLocked: "Étude verrouillée", opening: "Ouverture…", replayFromVault: "Rejouer depuis la Bibliothèque", libraryFilters: "Filtres", translation: "Traduction", pack: "Recueil", completedVerses: "Versets terminés", masteredVerses: "Versets maîtrisés", inProgressWaypoints: "Étapes en cours", favoriteVerses: "Versets favoris", tryAnotherFilter: "Essayez un autre filtre.", noActiveWaypoint: "Aucune étape active", noFavorites: "Aucun verset favori" },
  Sanctuary: { ...en.Sanctuary, backToVault: "Retour à la Bibliothèque", eyebrow: "Le Sanctuaire", reflection: "Réflexion", studyNote: "Note d’étude", yourNotes: "Vos notes privées", notePlaceholder: "Écrivez ce que vous souhaitez retenir…", saveNote: "Enregistrer la note", saving: "Enregistrement", favorite: "Favori", favorited: "Dans les favoris", lockedTitle: "Revenez après Radiance", practiceInProgress: "Entraînement en cours", reopensAfterRadiance: "Le Sanctuaire rouvre après Radiance.", returnToJourney: "Retour au parcours", navigation: "Navigation du Sanctuaire", updating: "Mise à jour", privateOnly: "Vous seul pouvez voir ceci." },
  Shop: { ...en.Shop, back: "Retour au parcours", journeyShop: "Boutique du parcours", trailSupplies: "Provisions du sentier", title: "Boutique d’Huile", subtitle: "Alimentez votre parcours.", glowBalance: "Solde de Lumière", hintsAvailable: "Indices disponibles", hintPacks: "Packs d’indices", donations: "Dons", donationsSoon: "Les dons arriveront plus tard.", buy: "Acheter", purchasing: "Achat", purchaseComplete: "Achat terminé", trailSupplied: "Provisions obtenues !", receivedHints: "+{count} indices", journeyHome: "Accueil du parcours", balances: "Soldes de la boutique", categories: "Catégories", restocking: "Réapprovisionnement", selectedItem: "Article sélectionné", hintPack: "Pack d’indices", moreGlow: "Plus de Lumière", moreGlowNeeded: "Lumière insuffisante" },
  Badges: { ...en.Badges, eyebrow: "Vos réussites", title: "Collection d’insignes", description: "Les étapes marquantes de votre parcours biblique.", earned: "Obtenu", locked: "Verrouillé", reward: "{points} Points de Lumière", empty: "Votre premier insigne vous attend.", unlocked: "Insigne débloqué !", pointsEarned: "Points de Lumière gagnés", shareBadge: "Partager l’insigne", backToGame: "Retour au jeu", newBalance: "Nouveau solde : {balance}", statusFilters: "Filtres des insignes", filters: { ALL: "Tous", COMPLETED: "Terminés", IN_PROGRESS: "En cours", LOCKED: "Verrouillés" }, category: "Catégorie", allCategories: "Toutes les catégories", rarity: "Rareté", allRarities: "Toutes les raretés", noMatch: "Aucun insigne ne correspond", clearFilters: "Effacer les filtres", secretBadge: "Insigne secret", rewardShort: "+{points} Lumière", unlockedOn: "Débloqué le {date}" },
  Auth: { ...en.Auth, loginTitle: "Bon retour", loginDescription: "Continuez votre parcours biblique.", registerTitle: "Commencez votre parcours", registerDescription: "Créez votre compte Scripture Memo.", email: "E-mail", password: "Mot de passe", name: "Nom affiché", login: "Se connecter", loggingIn: "Connexion", register: "Créer un compte", registering: "Création du compte", needAccount: "Nouveau sur Scripture Memo ?", haveAccount: "Vous avez déjà un compte ?", createAccount: "Créer un compte", chooseTranslation: "Choisissez votre traduction biblique", translationDescription: "Ce sera votre traduction par défaut. Vous pourrez la modifier dans les Paramètres.", saveTranslation: "Enregistrer la traduction", savingTranslation: "Enregistrement", forgotPassword: "Mot de passe oublié ?", forgotPasswordTitle: "Retrouvez votre chemin", forgotPasswordDescription: "Saisissez l’e-mail de votre compte pour préparer un lien sécurisé.", rememberPassword: "Vous vous souvenez du mot de passe ?", backToLogin: "Retour à la connexion", prepareReset: "Préparer le lien", preparingReset: "Préparation", downloadResetAgain: "Télécharger à nouveau", resetPasswordTitle: "Choisissez un nouveau mot de passe", resetPasswordDescription: "Créez un mot de passe robuste pour votre parcours.", newPassword: "Nouveau mot de passe", confirmPassword: "Confirmer le mot de passe", resetPassword: "Réinitialiser", resettingPassword: "Réinitialisation", resetLinkInvalidTitle: "Ce lien s’est éteint", resetLinkInvalidDescription: "Le lien est invalide, incomplet ou expiré.", requestNewReset: "Préparer un nouveau lien" },
  Fellowships: { ...en.Fellowships, eyebrow: "Avancez ensemble", title: "Communautés", description: "Trouvez une petite communauté et progressez ensemble sur le sentier.", yourFellowships: "Vos communautés", discover: "Découvrir", create: "Créer une communauté", createTitle: "Bâtir une communauté", createDescription: "Créez un lieu accueillant pour avancer ensemble.", creating: "Création", name: "Nom de la communauté", descriptionLabel: "Description", publicFellowship: "Communauté publique", publicDescription: "Tout le monde peut la trouver et la rejoindre. Une communauté privée exige un code.", public: "Communauté publique", private: "Communauté privée", members: "{count, plural, =1 {1 membre} other {# membres}}", member: "Membre", leader: "Responsable", globalMember: "Membre international", progress: "Progression", leaderboard: "Classement de la communauté", viewFellowship: "Voir", open: "Ouvrir", join: "Rejoindre", joined: "Communauté rejointe !", left: "Vous avez quitté la communauté.", leave: "Quitter", created: "Communauté créée !", noDescription: "Aucune description.", noneYet: "Votre cercle vous attend", nonePrompt: "Rejoignez une communauté publique, utilisez un code ou créez la vôtre.", noPublic: "Aucune communauté publique ne correspond.", search: "Rechercher des communautés", haveInvite: "Vous avez une invitation ?", invitePrompt: "Saisissez le code privé partagé par un membre.", invite: "Inviter", inviteTitle: "Inviter des joueurs", invitePanelDescription: "Invitez quelqu’un dans votre communauté.", inviteCode: "Code d’invitation", joinWithCode: "Rejoindre avec le code", inviteCopied: "Code copié.", inviteLinkCopied: "Lien copié.", inviteCopyFailed: "Impossible de copier cette invitation.", copy: "Copier", copyCode: "Code", copyLink: "Lien", shareInvite: "Partager", inviteShareTitle: "Rejoignez {name}", inviteShareText: "Rejoignez ma communauté Scripture Memo avec le code {code}.", inviteSharedFallback: "Invitation copiée.", inviteShareFailed: "Impossible de partager l’invitation.", regenerateInvite: "Créer un nouveau code", regenerateWarning: "L’invitation actuelle cessera de fonctionner.", regenerating: "Création", confirm: "Confirmer", cancel: "Annuler", inviteRegenerated: "Le nouveau code est prêt.", back: "Retour aux communautés", manage: "Gérer", editTitle: "Façonnez votre communauté", editDescription: "Modifiez son identité et sa visibilité.", backToFellowship: "Retour à la communauté", chooseInsignia: "Choisissez un insigne", insigniaDescription: "Choisissez un symbole pour votre communauté.", saveChanges: "Enregistrer", saving: "Enregistrement", updated: "Communauté mise à jour.", insignias: { wordStar: "Parole et étoile", goodShepherd: "Bon Berger", prayer: "Prière", fishers: "Pêcheurs", beacon: "Flambeau", ark: "Arche de la promesse", covenant: "Tables de l’alliance", crownedWord: "Parole couronnée", lighthouse: "Phare", livingWater: "Eau vive", calvary: "Calvaire", shield: "Bouclier de la foi" }, errors: { NAME_TAKEN: "Ce nom n’est pas disponible.", NOT_FOUND: "Cette communauté est introuvable.", ALREADY_MEMBER: "Vous appartenez déjà à cette communauté.", NOT_MEMBER: "Vous n’êtes pas membre de cette communauté.", LEADER_CANNOT_LEAVE: "Le responsable ne peut pas quitter la communauté. Le transfert arrivera plus tard.", CREATION_LIMIT: "Vous avez atteint la limite de création du jour.", NOT_LEADER: "Seul le responsable peut modifier ces paramètres.", UNKNOWN: "L’action n’a pas pu être effectuée." } },
  Leaderboard: {
    ...en.Leaderboard,
    eyebrow: "Le Grand Phare",
    title: "Classement",
    description: "Découvrez qui porte les Écritures le plus loin sur le sentier.",
    scopes: "Portées du classement",
    global: "Global",
    myLeague: "Ma ligue",
    fellowships: "Communautés",
    chooseFellowship: "Choisir une communauté",
    allTime: "Tous les temps",
    country: "Pays",
    podium: "Podium du phare",
    rankings: "Classement du sentier",
    rankHeader: "Rang",
    playerHeader: "Joueur",
    beaconPointsHeader: "Points de Balise",
    players: "{count, plural, =1 {1 joueur} other {# joueurs}}",
    you: "Vous",
    globalPlayer: "Joueur international",
    countryFlag: "Pays du joueur",
    trailRival: "Rival du sentier",
    trailRivalExplanation: "Un concurrent simulÃ© du sentier. Il ne modifie jamais votre rang officiel.",
    playerDetailsDescription:
      "Un aperçu du parcours de la Balise de ce joueur.",
    weeklyBeaconPoints: "Points de Balise hebdomadaires",
    beaconProgress: "Progression du Phare",
    lifetimeBeaconPoints: "Points de Balise cumulés",
    beaconLevel: "Niveau de Balise",
    crownsLabel: "Couronnes",
    waypoints: "{count} étapes terminées",
    glow: "{count} Points de Lumière",
    streak: "Série de {count} jours",
    weeklyXp: "{count} XP hebdomadaire du Phare",
    lifetimeXp: "{count} XP permanent du Phare",
    level: "Niveau du Phare {count}",
    crowns: "{count} Couronnes",
    leagueCompetition: "Ligue hebdomadaire",
    weeklyCompetition: "Classement hebdomadaire",
    leagueName: "Ligue {league}",
    weekEnds: "Réinitialisation lundi (UTC)",
    leagueEndsSoon: "La ligue se termine bientôt",
    leagueEndsInDays: "Fin dans {days}j {hours}h",
    leagueEndsInHours: "Fin dans {hours}h {minutes}min",
    leagueEndsInMinutes: "Fin dans {minutes}min",
    promotionZone: "Les {count} premiers montent",
    demotionZone: "Les {count} derniers descendent",
    joiningLeague: "Préparation de votre ligue hebdomadaire",
    viewLeagues: "Infos",
    rankInfoAria: "Fonctionnement du classement et des ligues",
    leagueJourney: "Fonctionnement du classement",
    leagueJourneyDescription: "Gagnez des points du Phare chaque semaine et progressez dans les ligues.",
    rankingRules: "Règles du classement hebdomadaire",
    ruleEarnTitle: "Jouez",
    ruleEarnDescription: "Gagnez des points du Phare hebdomadaires.",
    ruleResetTitle: "Réinitialisation",
    ruleResetDescription: "Chaque lundi à 00:00 UTC.",
    ruleMoveTitle: "Progressez",
    ruleMoveDescription: "Les 7 premiers montent, les 5 derniers descendent.",
    ruleSaintTitle: "Saint",
    ruleSaintDescription: "Les meilleurs classements gagnent des Couronnes.",
    leaguePath: "Parcours des ligues",
    leagueStep: "Ligue {number}",
    currentLeague: "Vous êtes ici",
    reachedLeague: "Atteinte",
    futureLeague: "À venir",
    leagueEmblemAlt: "Emblème de la ligue {league}",
    promote: "Montée",
    topCount: "Top {count}",
    stay: "Maintien",
    demote: "Descente",
    bottomCount: "Derniers {count}",
    noDemotion: "Aucune descente pour le moment",
    yourRankNumber: "Votre rang actuel est {rank}",
    leagues: {
      TRAVELER: "Voyageur",
      DISCIPLE: "Disciple",
      MESSENGER: "Messager",
      WATCHMAN: "Veilleur",
      TEACHER: "Enseignant",
      SHEPHERD: "Berger",
      ELDER: "Ancien",
      SCRIBE: "Scribe",
      SAINT: "Saint",
    },
    yourRank: "Votre rang",
    previous: "Précédent",
    next: "Suivant",
    opening: "Ouverture",
    noMorePlayers: "Aucun autre joueur sur cette page.",
    empty: "Le phare attend",
    emptyDescription: "Le classement apparaîtra lorsque les joueurs termineront des étapes.",
    countryMissing: "Choisissez votre pays",
    countryMissingDescription: "Définissez votre pays pour rejoindre son classement.",
    chooseCountry: "Ouvrir les paramètres",
  },
  PlayerTopBar: {
    ...en.PlayerTopBar,
    glowPoints: "Points de Lumière",
    streakDays: "Jours de série",
    beaconPoints: "Points Phare cumulés",
  },
  Notifications: {
    ...en.Notifications,
    open: "Ouvrir les notifications",
    title: "Notifications",
    description: "Les nouvelles de votre parcours.",
    markAllRead: "Tout lire",
    allRead: "Toutes les notifications sont marquées comme lues.",
    empty: "Tout est calme sur le sentier",
    weeklyResult: "Résultat hebdomadaire",
    promotedTitle: "Ligue supérieure !",
    promotedBody: "Vous passez en ligue {league}.",
    demotedTitle: "Nouvelle semaine, nouvel élan",
    demotedBody: "Vous passez en ligue {league}.",
    stayedTitle: "Ligue conservée !",
    stayedBody: "Vous restez en ligue {league}.",
    finalRank: "Classement final",
    crowns: "Couronnes",
    continue: "Continuer",
    systemTitle: "Nouvelle du parcours",
    systemBody: "Une nouveauté vous attend sur le sentier.",
  },
  Errors: { ...en.Errors, snag: "Oups, un problème est survenu", loadFailed: "Luna n’a pas pu charger ceci. Réessayez.", notFound: "Ce sentier est introuvable." }
};

// Keep the two leader-only invite settings labels readable in French while the
// namespace spread continues to provide safe fallback coverage for new keys.
fr.Fellowships.inviteSettingsTitle = "Accès par invitation";
fr.Fellowships.inviteSettingsDescription = "Remplacez le code si une ancienne invitation ne doit plus fonctionner.";
fr.Fellowships.invitedEyebrow = "Vous êtes invité";
fr.Fellowships.acceptInvite = "Rejoindre la communauté";
fr.Fellowships.joining = "Connexion";
fr.Fellowships.loginToJoin = "Se connecter pour rejoindre";
fr.Fellowships.createToJoin = "Créer un compte";
fr.Fellowships.inviteExpiredTitle = "Cette invitation s’est éteinte";
fr.Fellowships.inviteExpiredDescription = "Le lien est peut-être ancien, remplacé ou incomplet.";
fr.Fellowships.findFellowships = "Trouver des communautés";
Object.assign(fr.Fellowships, {
  publicShort: "Publique", privateShort: "Privée", requestToJoin: "Demander à rejoindre", requestSubmitted: "Demande envoyée au responsable.", requestPending: "Demande en attente", cancelRequest: "Annuler la demande", requestCancelled: "Demande annulée.", declineInvite: "Refuser l’invitation", noFellowships: "Aucune communauté ne correspond.", leaderTools: "Outils du responsable", joinRequests: "Demandes d’adhésion", pendingCount: "{count, plural, =1 {1 en attente} other {# en attente}}", fromInvite: "Demande depuis une invitation", fromDirectory: "Demande depuis l’annuaire", approve: "Accepter", reject: "Refuser", requestApproved: "Demande acceptée.", requestRejected: "Demande refusée.", noPendingRequests: "Aucune demande à examiner.", requestHistory: "Historique des demandes",
  requestStatuses: { APPROVED: "Acceptée", REJECTED: "Refusée", CANCELLED: "Annulée", PENDING: "En attente" },
  requestErrors: { REQUEST_PENDING: "Votre demande est déjà en attente.", REQUEST_NOT_FOUND: "Cette demande est introuvable.", REQUEST_NOT_PENDING: "Cette demande a déjà été traitée." },
  membersTab: "Membres", requestsTab: "Demandes", aboutTab: "À propos", aboutFellowship: "À propos de cette communauté", publicAccessDescription: "Les joueurs peuvent rejoindre immédiatement depuis l’annuaire ou une invitation.", privateAccessDescription: "Les joueurs demandent l’accès et rejoignent après l’accord du responsable.", completedWaypointsMetric: "Étapes terminées", glowPointsMetric: "Points de Lumière",
});

export default fr;
