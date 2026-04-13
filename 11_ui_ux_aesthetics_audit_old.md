# 🎨 Audit UI/UX & Esthétique - Sidetrack

## 1. Cohérence du Système de Design

### Observations
*   **Thématisation Centrale :** L'application utilise un fichier `theme.ts` solide définissant les `COLORS`, `FONTS`, `SPACING`, `SHADOWS` et `BORDER_RADIUS`. C'est une excellente base pour la cohérence.
*   **Utilisation des Couleurs :** La palette est moderne (fond sombre `#07070B`, accentuation `primary` dorée `#C8A555`). L'utilisation de variantes "muted" (ex: `primaryMuted`) pour les badges et les états actifs est une bonne pratique.
*   **Typographie :** L'utilisation de *Space Grotesk* pour les titres et *Inter* pour le corps du texte apporte un aspect "Premium" et lisible.
*   **Valeurs codées en dur ("Magic Numbers") :**
    *   Bien que le système de spacing soit présent, plusieurs composants utilisent encore des valeurs arbitraires (ex: `paddingTop: Platform.OS === 'android' ? 44 : 0` répété dans `ProfileScreen.tsx` et `HistoryScreen.styles.ts`).
    *   Des espacements de `100` ou `120` pixels en bas des listes pour compenser la TabBar sont souvent codés en dur au lieu d'utiliser une constante `LAYOUT.TAB_BAR_FULL_HEIGHT`.
    *   Certaines icônes ont des tailles fixes (48, 24) sans lien avec une échelle de design.

### Recommandations
*   **Centraliser les constantes de plateforme :** Déplacer le calcul du `SAFE_AREA_PADDING` dans `CONFIG.LAYOUT` ou utiliser systématiquement `useSafeAreaInsets` de `react-native-safe-area-context` pour éviter les valeurs magiques de `44`.
*   **Audit des styles inline :** Remplacer les styles inline (ex: `style={{ height: 100 }}` dans `ProfileScreen`) par des styles définis dans les fichiers `.styles.ts`.

---

## 2. Hiérarchie Visuelle

### Observations
*   **Écrans de Détails :** Les écrans `MovieDetail` et `EpisodeDetail` utilisent bien l'imagerie (backdrops) et des dégradés pour attirer l'œil. Les boutons d'action (Log/Watched) sont clairs.
*   **Listes :** Dans `HistoryScreen`, la séparation entre Films et Séries est bien marquée par des cartes de styles différents, ce qui aide à la lecture.
*   **Surcharge d'information :** Sur certains écrans comme `ProfileScreen`, la quantité de "Quick Stats" peut diluer l'attention. Les "Stat Pills" sont toutes de la même taille, ce qui ne met pas en avant la donnée la plus importante (probablement le nombre total de films ou le streak).

### Recommandations
*   **Point focal :** Sur le profil, agrandir la "Personality Card" ou le "Streak" pour créer un point d'ancrage visuel plus fort.
*   **Contraste des métadonnées :** Augmenter légèrement le contraste des textes secondaires (`COLORS.text.secondary`) qui peuvent paraître un peu ternes sur le fond très sombre dans des conditions de forte luminosité.

---

## 3. Modernisation de l'UI

### Observations
*   **Éléments Modernes :** L'usage de `BlurView` pour la barre de navigation et les modals (`GDPRConsentModal`) est très qualitatif.
*   **Arrondis :** L'utilisation de `BORDER_RADIUS.l` et `xl` apporte une douceur bienvenue qui compense le côté "technique" du mode sombre.
*   **Skeuomorphisme discret :** L'application évite les aplats de couleurs ennuyeux grâce aux dégradés subtils dans les cartes de "Wrapped".

### Recommandations
*   **Glassmorphism :** Étendre l'utilisation de l'effet de flou (Glassmorphism) aux en-têtes de listes lors du défilement (Sticky Headers).
*   **Micro-ombres :** Les ombres définies dans `SHADOWS` pourraient être plus diffuses et colorées (utilisant une fraction de la couleur d'accentuation) plutôt que du noir pur, pour un look plus organique.

---

## 4. Retours Visuels et Micro-interactions

### Observations
*   **Haptique :** Excellente intégration de `expo-haptics` (notamment dans `SwipeableStars` et les suppressions), ce qui renforce le sentiment de qualité.
*   **États Tactiles :** L'utilisation de `activeOpacity` est cohérente mais les valeurs varient (0.7 à 0.85). Cela crée une légère irrégularité dans la sensation de "clic".
*   **États "Disabled" :** Les états désactivés sont gérés (opacité réduite), mais manquent parfois d'un changement de couleur plus explicite pour les icônes.
*   **Animations de transition :** Le slide-up des détails (`MainNavigation.tsx`) est fluide grâce à `Animated.spring`.

### Recommandations
*   **Standardiser les interactions :** Créer un composant wrapper `BaseButton` ou `TouchFeedback` qui impose une `activeOpacity` constante (ex: 0.7) et un délai de feedback uniforme.
*   **Transitions d'images :** Le composant `FadeImage` est une excellente touche. Appliquer un effet de "scale" très léger lors de l'apparition de l'image pour un effet encore plus dynamique.

---

## 5. Respect des Plateformes (iOS / Android)

### Observations
*   **Safe Areas :** Une attention particulière a été portée aux encoches, mais l'implémentation repose souvent sur des ternaires `Platform.OS === 'ios'`.
*   **Composants Natifs :** Le `DatePicker` est custom. Bien que beau, il s'éloigne des standards auxquels les utilisateurs de chaque plateforme sont habitués (rouleaux iOS vs calendrier Material Android).
*   **Navigation :** Le comportement du bouton "Back" sur Android est bien géré manuellement, ce qui est crucial pour l'UX.

### Recommandations
*   **Gestes iOS :** S'assurer que le "Swipe to go back" fonctionne nativement sur les écrans de détails. Actuellement, l'overlay est géré via un état global, ce qui peut briser le geste de retour natif d'iOS.
*   **Élévation Android :** Utiliser la propriété `elevation` de manière plus exhaustive pour Android pour simuler la profondeur, en complément des ombres iOS.

---
**Note :** Cet audit est purement consultatif. Aucune modification n'a été apportée au code source.
