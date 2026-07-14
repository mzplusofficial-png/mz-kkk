import React, { useState, useEffect } from "react";
import {
  BookOpen,
  GraduationCap,
  Award,
  Play,
  Pause,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Star,
  Flame,
  Trophy,
  Save,
  Volume2,
  VolumeX,
  Target,
  Sparkles,
  RefreshCw,
  Clock,
  ArrowRight,
  ArrowLeft,
  Lock,
  Copy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { UserProfile } from "../types";

interface FormationTabProps {
  profile: UserProfile | null;
  onSwitchTab?: (tab: string) => void;
}

import { MODULE_SECTIONS, FormationSection } from "./features/bonus/formationData";

const FIRST_MILLION_SECTIONS: FormationSection[] = [
  {
    id: "fm_chap1",
    title: "Chapitre 1 : Qu'est-ce que l'affiliation concrètement ?",
    subtitle: "Comprendre le modèle d'affaires de recommandation sans aucune compétence préalable",
    content: `Bienvenue dans ce tout premier chapitre du Module 2 !

Avant de vous lancer dans la création de contenus et la recherche de clients, il est capital de comprendre exactement dans quelle aventure vous vous engagez. Oubliez les théories compliquées : nous allons voir ensemble ce qu'est l'affiliation de la manière la plus simple et concrète possible.

---

## 1. Qu'est-ce que l'affiliation concrètement ?

L'affiliation est un modèle d'affaires d'une simplicité redoutable. Son principe repose sur une idée très simple : **recommander des produits créés par d'autres en échange d'une récompense financière.**

Le processus se déroule en trois étapes claires :
1. **Vous choisissez un produit** de qualité qui répond à un besoin précis.
2. **Vous en faites la promotion** auprès d'un public ciblé (nous allons vous montrer exactement comment faire cela gratuitement).
3. **À chaque vente réalisée** grâce à votre recommandation, vous recevez automatiquement une **commission** (généralement un pourcentage important du prix de vente).

> **Exemple concret :** Si vous faites la promotion d'une formation ou d'un service d'une valeur de **20 000 FCFA** avec une commission de **50 %**, vous gagnez **10 000 FCFA** pour chaque personne qui l'achète grâce à vous. Faites seulement 10 ventes par mois, et vous générez 100 000 FCFA de revenus complémentaires. Faites-en 100, et vous touchez **1 000 000 FCFA** !

---

## 2. Où se trouvent les produits à promouvoir ?

La bonne nouvelle, c'est que vous n'avez pas besoin de chercher des heures ou de négocier avec des fournisseurs. **Tous les produits à fort potentiel de vente sont déjà disponibles et prêts à être promus directement dans votre boutique personnalisée sur notre plateforme !**

Votre boutique est déjà créée et configurée pour vous. Les produits s'y trouvent avec leurs descriptions, leurs visuels de présentation, et vos liens d'affiliation uniques. Votre seul travail consiste à attirer des visiteurs vers votre boutique. Vous n'avez pas à gérer de stocks physiques, pas de logistique, pas de livraison, et pas de service après-vente. Tout cela est entièrement automatisé pour vous !

---

## 3. Aucune compétence requise : nous allons tout vous montrer !

Peut-être vous dites-vous : *« Je ne sais pas vendre », « Je ne connais rien au marketing »,* ou *« Je n'ai jamais créé de contenu sur Internet »*.

**Rassurez-vous immédiatement : vous n'avez besoin d'aucune compétence préalable !**

Au cours des prochains chapitres de ce module, nous allons vous prendre par la main et vous dévoiler, étape par étape :
- Comment choisir le produit idéal pour démarrer.
- Comment identifier avec précision les clients qui attendent ce produit.
- Quelles stratégies de promotion utiliser (notamment la méthode organique ultra-puissante et gratuite sur TikTok).
- Comment créer des vidéos simples qui attirent des milliers de vues et de clients sans même montrer votre visage si vous préférez rester anonyme.

Tout ce que nous vous demandons, c'est d'être **curieux**, **rigoureux** et de **suivre la méthode pas à pas**. Nous vous montrons absolument tout, de A à Z. Votre succès n'est qu'une question d'application !`,
    introspection: "Êtes-vous prêt à vous détacher de la peur de vendre et à embrasser un système simple basé sur le partage de valeur ?",
    exerciseType: "text",
    exerciseId: "fm_affiliation_intro_exercise",
    exerciseLabel: "En vos propres termes, expliquez comment l'affiliation va vous permettre de générer des revenus sans avoir à créer de produit :",
    analogy: "L'affiliation est comme un conseiller de vente dans une grande boutique : il conseille les clients vers le meilleur produit, et le magasin le récompense avec une prime pour chaque recommandation réussie.",
    example: "Vous partagez votre lien d'affiliation pour un produit d'apprentissage de compétences en ligne. Un étudiant l'achète pour 15 000 FCFA. Vous recevez instantanément votre commission de 7 500 FCFA sur votre compte."
  },
  {
    id: "fm_chap2",
    title: "Chapitre 2 : Choisir le bon produit",
    subtitle: "Comment choisir le bon produit à promouvoir",
    content: `Nous allons maintenant passer au chapitre 2. Dans cette partie, nous allons voir comment choisir efficacement un produit à promouvoir.

Avant de sélectionner un produit, il est essentiel de se poser les bonnes questions. Beaucoup de personnes choisissent un produit au hasard et commencent immédiatement à le promouvoir. Pourtant, cette approche peut conduire à de mauvais résultats, non pas parce que le produit est mauvais, mais parce qu'il n'est tout simplement pas adapté à leur profil ou à leur audience.

En réalité, il n'existe pas de « mauvais produit ». Chaque produit correspond à un certain type de personne, à un marché spécifique ou à un contexte particulier. Par exemple, un produit peut permettre à une personne de générer 50 000 francs, tandis qu'une autre n'arrivera même pas à réaliser une seule vente avec exactement le même produit. La différence vient souvent de la cohérence entre le produit, les compétences de la personne et le public auquel elle s'adresse.

Prenons l'exemple d'un produit lié au business en ligne. Une personne qui possède déjà des connaissances dans ce domaine aura généralement plus de facilité à le promouvoir qu'une personne qui débute complètement.

Avant de choisir un produit, pose-toi ces trois questions :

1. **Quel problème ce produit résout-il ?**
   Tu dois être capable d'identifier précisément le problème auquel il apporte une solution.

2. **Ce produit est-il actuellement en forte demande ?**
   Vérifie qu'il répond à un besoin réel et recherché par de nombreuses personnes aujourd'hui.

3. **Est-ce un produit qui te parle et que tu serais fier de recommander ?**
   Si tu crois sincèrement en ce que tu proposes, tu seras naturellement plus convaincant dans ton contenu et dans ta manière de le présenter.

Prenons un exemple concret avec un produit intitulé : **« Comment gagner ses premiers 50 000 francs en ligne »**.

Le principal problème qu'il résout est le manque de méthode pour les débutants qui souhaitent commencer à générer des revenus sur Internet. Beaucoup de personnes veulent gagner de l'argent en ligne mais ne savent tout simplement pas par où commencer.

Identifier clairement ce problème est essentiel, car cela te permettra de savoir à qui t'adresser lorsque tu feras la promotion du produit. Plus tu comprends ton produit et les difficultés qu'il résout, plus ton message sera pertinent et efficace.

Concernant la demande, ce type de produit restera toujours recherché, car de nouvelles personnes se lancent chaque jour dans le business en ligne et cherchent une méthode fiable pour obtenir leurs premiers résultats.

Tu peux appliquer cette même méthode à n'importe quel produit : analyse le problème qu'il résout, vérifie qu'il existe une demande réelle et demande-toi s'il t'inspire suffisamment pour le promouvoir avec conviction.

Choisis toujours un produit auquel tu crois. Lorsque tu es convaincu de sa valeur, cette confiance se ressent dans tes contenus, dans tes explications et dans ta capacité à convaincre les autres.`
  },
  {
    id: "fm_chap3",
    title: "Chapitre 3 : Définir son buyer persona",
    subtitle: "Découvrir et cibler votre client idéal",
    content: `Maintenant que vous savez comment choisir le bon produit, passons à une étape tout aussi importante : définir votre **buyer persona**.

Le buyer persona, c’est tout simplement le **client idéal**, c’est-à-dire la personne la plus susceptible d’acheter votre produit. Vous devez être capable de la visualiser clairement et de comprendre qui elle est.

Pourquoi est-ce si important ? Parce que lorsque vous connaissez parfaitement votre client idéal, vous pouvez créer des contenus et des messages qui lui parlent directement. Résultat : vous augmentez considérablement vos chances de réaliser des ventes.

Même si toutes les personnes que vous touchez ne correspondent pas exactement à ce profil, cette connaissance vous aidera à communiquer plus efficacement et à convaincre un public beaucoup plus large.

## Comment créer son buyer persona ?

Votre buyer persona doit toujours être défini en fonction du produit que vous souhaitez promouvoir. Pour le construire, répondez à ces cinq questions essentielles :

### 1. Qui est mon client idéal ?

Décrivez précisément la personne à qui vous voulez vendre votre produit : son profil, sa situation et son mode de vie.

### 2. Quelle est sa tranche d’âge ?

Connaître l’âge de votre audience est indispensable. Par exemple, si vous vendez un produit sur la vitalité ou la retraite, il sera probablement plus pertinent de cibler des personnes de 60 à 70 ans que des adolescents.

### 3. Quelles sont ses plus grandes peurs ou frustrations ?

Identifiez les difficultés, les blocages ou les inquiétudes que rencontre votre client idéal en lien avec le problème que votre produit résout.

### 4. Que veut-il vraiment obtenir ?

Les gens n’achètent pas seulement un produit : ils achètent une **transformation**. Ils veulent atteindre un résultat, résoudre un problème ou améliorer leur situation. Vous devez comprendre précisément cette transformation pour mieux communiquer dessus.

### 5. Quelles sont ses objections ?

Demandez-vous ce qui pourrait empêcher cette personne de passer à l’achat. Elle peut penser que le produit est trop cher, qu’il ne fonctionnera pas pour elle ou qu’elle manque de temps. En anticipant ces objections, vous pourrez y répondre dans votre communication et renforcer la confiance.

Créer un buyer persona est une étape essentielle. Plus vous connaissez votre client idéal, plus vos messages seront pertinents, plus votre marketing sera efficace et plus vous aurez de chances de convertir votre audience en clients.



# Exemple concret de buyer persona

Prenons maintenant un exemple concret de buyer persona avec le produit **« Réfléchissez et devenez riche »**.

Pour construire ce profil, nous allons répondre aux cinq questions essentielles.

### 1. Qui est mon client idéal ?

Le client idéal est une personne ambitieuse qui souhaite améliorer sa situation financière. Elle s'intéresse au développement personnel, à l'entrepreneuriat ou à l'éducation financière et cherche des moyens d'évoluer dans sa vie.

### 2. Quel âge a-t-il ?

Pour ce type de produit, la tranche d'âge la plus pertinente se situe généralement entre **18 et 30 ans**. Ce sont souvent des personnes en quête d'opportunités, de connaissances et d'un changement positif dans leur avenir financier.

### 3. Quel est son plus grand problème ou sa plus grande frustration ?

Son principal problème est qu'il a l'impression de faire des efforts sans obtenir les résultats qu'il espère. Il se sent bloqué, manque de direction et ne sait pas quelles actions concrètes entreprendre pour progresser financièrement.

### 4. Quelle transformation recherche-t-il réellement ?

Il ne cherche pas simplement à lire un livre. Ce qu'il veut vraiment, c'est développer un état d'esprit orienté vers la réussite, apprendre à prendre de meilleures décisions financières et acquérir les connaissances nécessaires pour construire une vie plus stable et plus prospère sur le plan financier.

### 5. Quelles sont ses objections avant d'acheter ?

Avant de passer à l'achat, il peut se poser plusieurs questions :

* Est-ce que ce produit va réellement m'apporter quelque chose ?
* Est-ce qu'il contient des conseils pratiques ou seulement de la motivation ?
* Est-ce que je vais pouvoir appliquer ce que j'apprends à ma propre situation ?
* Est-ce que ce produit vaut vraiment son prix ?
* Est-ce qu'il peut réellement m'aider à changer ma situation financière ?

En identifiant ces objections à l'avance, vous pouvez y répondre directement dans votre communication et renforcer la confiance de votre audience.

Le point le plus important à retenir est que le client n'achète pas uniquement un livre ou un produit. Il achète l'espoir d'une transformation. Dans cet exemple, il cherche avant tout à changer sa trajectoire financière, à adopter un meilleur état d'esprit et à acquérir des compétences qui l'aideront à progresser vers ses objectifs. C'est cette promesse de transformation qui motive le plus souvent la décision d'achat.`,
    introspection: "Qui est exactement la personne derrière l'écran ? Quels sont ses désirs les plus secrets et ses objections d'achat les plus tenaces ?",
    exerciseType: "text",
    exerciseId: "fm_buyer_persona_exercise",
    exerciseLabel: "Définissez votre propre Buyer Persona (Qui est-il ? Quel âge ? Problèmes ? Transformation ? Objections) :",
    analogy: "Votre buyer persona est comme un portrait-robot d'élite d'une cible de haute précision : viser à l'aveugle gaspille votre énergie, cibler avec précision garantit l'impact.",
    example: "Pour 'Réfléchissez et devenez riche', le buyer persona n'est pas simplement 'tout le monde'. C'est un jeune actif ambitieux de 18-30 ans cherchant une transformation mentale et financière."
  },
  {
    id: "fm_chap4",
    title: "Chapitre 4 : Comment promouvoir votre produit",
    subtitle: "Organique vs Publicité : Choisir sa stratégie d'acquisition",
    content: `Maintenant que vous avez choisi votre produit et que vous connaissez parfaitement votre client idéal, une question essentielle se pose :

**Comment trouver des clients et promouvoir votre produit ?**

Il existe principalement **deux méthodes**.

## 1. La promotion organique

La première méthode consiste à publier du contenu gratuitement sur les réseaux sociaux, notamment sur TikTok. Vous pouvez créer vos vidéos avec votre visage ou utiliser des outils d’intelligence artificielle si vous préférez rester anonyme.

L’objectif est simple : publier régulièrement du contenu de qualité afin d’attirer naturellement une audience intéressée par votre offre.

### Les avantages de l’organique

* Le coût est très faible, voire nul.
* Vous construisez une communauté qui vous connaît et vous fait confiance.
* À long terme, cette confiance peut générer des ventes de manière régulière.

### Les inconvénients de l’organique

* Les résultats prennent du temps.
* Il faut être constant et publier fréquemment.
* Il est normal que les premières vidéos ne génèrent pas beaucoup de vues ou de ventes.

Beaucoup abandonnent trop tôt. Pourtant, avec de la persévérance, une communauté engagée peut devenir une véritable source de revenus.

## 2. La publicité payante

La deuxième méthode consiste à utiliser des plateformes publicitaires comme Facebook ou TikTok pour diffuser vos annonces auprès d’un public ciblé.

L’un des principaux avantages est la rapidité. Contrairement à l’organique, il est possible d’obtenir des visites ou même des ventes dès les premiers jours si votre campagne est bien conçue.

### Les avantages de la publicité

* Résultats potentiellement rapides.
* Accès immédiat à une audience ciblée.
* Possibilité de faire évoluer rapidement votre activité.

### Les inconvénients de la publicité

* Elle nécessite un budget.
* Sans une bonne stratégie, vous pouvez dépenser de l’argent sans obtenir les résultats espérés.
* Il est important d’apprendre les bases de la création et de l’optimisation des campagnes.

## Quelle méthode choisir ?

Vous pouvez choisir l’une de ces méthodes ou les combiner.

* **L’organique** est idéale pour construire une marque forte et une relation durable avec votre audience.
* **La publicité** permet d’accélérer les résultats si vous disposez d’un budget et d’une stratégie adaptée.

Le plus efficace est souvent de développer progressivement une présence organique tout en utilisant la publicité de manière réfléchie pour amplifier votre croissance.`,
    introspection: "Préférez-vous investir du temps (organique) ou de l'argent (publicité) pour démarrer ? Quelle est votre tolérance au risque et à la patience ?",
    exerciseType: "text",
    exerciseId: "fm_promo_strategy_exercise",
    exerciseLabel: "Décrivez votre plan d'action de promotion (Allez-vous commencer en organique, payant, ou un mix des deux ? Sur quelle plateforme ?) :",
    analogy: "La promotion organique est comme planter un arbre (lent à pousser, mais offre de l'ombre gratuite pour toujours). La publicité payante est comme un robinet d'eau (l'eau coule instantanément, mais s'arrête dès que vous fermez le robinet).",
    example: "Pour un budget de départ de 0$, lancez un compte TikTok thématique sans visage (faceless) en publiant 2 fois par jour sur l'éducation financière. Si vous avez 150$ de budget de test, configurez une campagne publicitaire TikTok Ads ciblée."
  },
  {
    id: "fm_chap5",
    title: "Chapitre 5 : Promouvoir ses produits grâce à la méthode organique sur TikTok",
    subtitle: "Maîtriser l'art de l'organique TikTok de A à Z",
    content: `Dans ce chapitre, nous allons apprendre à promouvoir un produit de manière **100 % organique**, c’est-à-dire sans dépenser d’argent en publicité.

Pour cette formation, nous allons principalement utiliser **TikTok**, car c’est l’un des réseaux sociaux les plus puissants pour atteindre rapidement une large audience. Plus tard, d’autres plateformes pourront être abordées, mais TikTok constitue aujourd’hui un excellent point de départ.

## Étape 1 : Créer et configurer correctement son compte

Commencez par créer un compte TikTok dédié à votre activité.

Votre profil représente votre image. Il doit donc être soigné et inspirer confiance. Choisissez un nom cohérent, une photo de profil de qualité et une biographie claire afin que les visiteurs comprennent immédiatement le thème de votre compte.

Un profil bien présenté donne une impression plus professionnelle et augmente les chances qu’un visiteur s’abonne ou regarde vos prochaines vidéos.

## Étape 2 : Désactiver la synchronisation des contacts

Après la création du compte, il est conseillé de désactiver l’accès aux contacts.

L’objectif est d’éviter que TikTok diffuse principalement vos premières vidéos à votre entourage. Vous souhaitez que l’algorithme découvre progressivement le public réellement intéressé par votre contenu, plutôt que de se concentrer uniquement sur vos connaissances.

## Étape 3 : La phase de « réchauffement » du compte (l’embauche)

C’est l’une des étapes les plus importantes avant de commencer à publier.

Beaucoup de personnes créent un compte et mettent immédiatement une vidéo en ligne. Pourtant, il est préférable de prendre quelques jours pour utiliser le compte comme le ferait un utilisateur normal.

Pendant **3 à 5 jours**, utilisez TikTok naturellement :

* Regardez des vidéos dans votre domaine.
* Regardez-les réellement, sans les faire défiler à toute vitesse.
* Aimez uniquement les contenus qui vous plaisent.
* Commentez lorsque vous avez quelque chose de pertinent à dire.
* Suivez quelques créateurs dont les contenus sont proches de votre thématique.

Cette période permet de montrer que le compte est utilisé de manière normale et d’aider TikTok à mieux comprendre le type de contenu qui vous intéresse.

### Ce qu’il faut éviter

* Liker des centaines de vidéos en quelques minutes.
* Publier des commentaires répétitifs ou sans intérêt.
* Enchaîner des actions trop rapidement de manière artificielle.
* Créer le compte et publier immédiatement des dizaines de vidéos.

Votre comportement doit ressembler à celui d’une personne qui utilise réellement la plateforme.

### Pourquoi cette étape est-elle importante ?

Cette phase prépare votre compte avant vos premières publications. Elle contribue à créer un historique d’utilisation cohérent et peut aider l’algorithme à mieux catégoriser votre profil.

Ensuite, lorsque vous commencerez à publier régulièrement du contenu de qualité, TikTok disposera déjà de premiers signaux sur votre compte et sur le type d’audience susceptible d’être intéressée. Nous vous invitons à regarder cette vidéo pour plus d'explications :`,
    youtubeId: "68t3gLqR_9k",
    introspection: "Êtes-vous prêt à être rigoureux et régulier sur TikTok pendant 30 jours sans abandonner, même si les premières vidéos font peu de vues ?",
    exerciseType: "text",
    exerciseId: "fm_tiktok_warmup_exercise",
    exerciseLabel: "Établissez votre plan de réchauffement (Quels comptes allez-vous suivre ? Pendant combien de jours ? Quels hashtags ?) :",
    analogy: "Un compte TikTok est comme un nouvel employé : il a besoin d'une période d'intégration (réchauffement) pour comprendre la culture de l'entreprise avant de pouvoir être productif.",
    example: "Créez votre compte, désactivez les contacts, puis cherchez 'éducation financière' sur TikTok. Passez 15 minutes par jour pendant 4 jours à regarder, liker intelligemment et commenter avec valeur sur les vidéos qui performent."
  },
  {
    id: "fm_chap6",
    title: "Chapitre 6 : Comprendre l’algorithme de TikTok",
    subtitle: "Décoder les rouages de la visibilité virale",
    content: `Avant de chercher à rendre une vidéo virale, il est essentiel de comprendre comment fonctionne l’algorithme de TikTok.

Pourquoi ? Parce que si vous comprenez comment vos vidéos sont évaluées et diffusées, vous pourrez analyser leurs performances, identifier ce qui fonctionne et améliorer progressivement vos résultats.

## Les premières vidéos de votre compte

Lorsque vous créez un nouveau compte, TikTok peut tester vos premières publications auprès d'un petit groupe d'utilisateurs afin d'évaluer leur intérêt.

Ces premiers contenus sont importants, car ils donnent à l'algorithme des informations sur votre type de contenu et sur les personnes susceptibles d'y réagir.

C'est pourquoi il est conseillé de publier des vidéos de qualité dès le début et de prendre le temps de bien préparer son compte avant de se lancer.

## Comment TikTok décide-t-il de montrer une vidéo à plus de personnes ?

Contrairement à une idée répandue, TikTok ne choisit pas les vidéos uniquement en fonction du nombre de vues.

La plateforme observe surtout les réactions des utilisateurs. Si une vidéo suscite beaucoup d'intérêt, elle peut être montrée à davantage de personnes.

En pratique, une nouvelle vidéo est souvent présentée à un premier groupe d'utilisateurs. Si ce groupe réagit positivement, TikTok peut élargir progressivement sa diffusion à un public plus important.

## Les signaux les plus importants

Même si TikTok ne publie pas les détails exacts de son algorithme, plusieurs éléments sont généralement considérés comme des indicateurs positifs :

### 1. Le temps de visionnage

Plus les spectateurs regardent votre vidéo longtemps, mieux c'est.

Si beaucoup de personnes quittent la vidéo après quelques secondes, cela peut indiquer que le contenu ne retient pas suffisamment l'attention.

### 2. Le taux de visionnage complet

Lorsqu'un utilisateur regarde votre vidéo jusqu'à la fin, c'est un signal fort montrant que le contenu est intéressant.

Plus ce taux est élevé, plus vos chances de toucher une audience plus large peuvent augmenter.

### 3. Les repartages

Si quelqu'un partage votre vidéo avec un ami ou sur une autre plateforme, cela montre qu'il la juge suffisamment utile ou divertissante pour la recommander.

### 4. Les commentaires

Les commentaires indiquent que votre contenu provoque une réaction ou suscite une discussion.

Des commentaires authentiques sont généralement plus utiles que des messages très courts ou répétitifs.

### 5. Les ajouts aux favoris

Lorsqu'une personne enregistre votre vidéo pour la revoir plus tard, cela peut être interprété comme un signe qu'elle lui apporte de la valeur.

### 6. Les mentions « J'aime »

Les likes restent positifs, mais ils ne sont qu'un des nombreux signaux pris en compte.

Une vidéo avec moins de likes mais un excellent temps de visionnage peut parfois mieux performer qu'une vidéo très likée mais rapidement abandonnée.

## Existe-t-il un système de points ?

Beaucoup de créateurs parlent d'un « système de points » où chaque like, commentaire ou favori aurait une valeur précise.

En réalité, **TikTok ne publie pas de système officiel de points**. Personne en dehors de l'entreprise ne connaît la formule exacte utilisée par l'algorithme.

Il est donc préférable de retenir une idée simple :

> Plus votre vidéo capte l'attention et génère des interactions sincères, plus elle a de chances d'être recommandée à un public plus large.

## Comment augmenter ses chances de devenir viral ?

* Attirez l'attention dès les premières secondes.
* Utilisez un sujet qui intéresse votre audience.
* Gardez un rythme dynamique.
* Encouragez naturellement les spectateurs à regarder jusqu'au bout.
* Incitez à commenter ou à partager lorsque cela a du sens.
* Publiez régulièrement afin de tester différents formats.

## Ce qu'il faut retenir

Le rôle de l'algorithme est de montrer aux utilisateurs les vidéos qui ont le plus de chances de les intéresser.

Votre objectif n'est donc pas seulement d'obtenir des vues, mais de créer un contenu que les gens regardent jusqu'à la fin, apprécient, enregistrent, commentent et partagent.

En vous concentrant sur la qualité de vos vidéos et sur l'intérêt réel qu'elles apportent à votre audience, vous augmentez progressivement vos chances de toucher un public toujours plus large.`,
    introspection: "Quels signaux parmi les 6 présentés sont selon vous les plus faciles à optimiser par de simples techniques d'écriture ou de montage ?",
    exerciseType: "text",
    exerciseId: "fm_tiktok_algorithm_exercise",
    exerciseLabel: "Analysez votre propre stratégie d'accroche (Comment allez-vous forcer le visionnage complet et encourager l'engagement dès les 3 premières secondes ?) :",
    analogy: "L'algorithme de TikTok est comme un juge de talent impartial : il ne regarde pas votre nom ni votre passé, il compte simplement le nombre de spectateurs qui restent assis jusqu'à la fin de votre spectacle.",
    example: "Créez une forte accroche visuelle et textuelle de 3 secondes ('Ne faites jamais cette erreur financière à 20 ans...'), posez une question ouverte au milieu pour susciter les commentaires, et donnez la réponse ou la conclusion à l'extrême fin de la vidéo pour booster le taux de complétion."
  },
  {
    id: "fm_chap7",
    title: "Chapitre 7 : Comprendre vraiment la création de contenu sur TikTok",
    subtitle: "L'art de captiver l'attention et de bâtir la confiance humaine",
    content: `Maintenant, on entre dans une partie extrêmement importante : la création de contenu.

Parce qu’à ce niveau-là, ce n’est plus juste “poster des vidéos”. C’est apprendre à **captiver des humains**, à retenir leur attention, et surtout à les amener à te faire confiance.

Et sur TikTok, tout repose sur une seule chose : **l’attention**.

Si tu ne sais pas la capter, tu n’existes pas.

---

## Une vidéo virale n’est pas un hasard

Beaucoup de gens pensent qu’une vidéo devient virale par chance. En réalité, une vidéo virale suit une structure très précise.

Peu importe la niche, peu importe le produit, peu importe le pays : une vidéo efficace est toujours construite en **trois étapes psychologiques**.

Et ces trois étapes correspondent à la manière dont le cerveau humain consomme une information.

---

## 1. Le Hook : la porte d’entrée de ton attention

Le hook, c’est les toutes premières secondes de ta vidéo.

Et c’est là que tout se joue.

Pourquoi ?

Parce que sur TikTok, les gens ne viennent pas pour te donner du temps. Ils scrollent. Ils testent. Ils jugent en 1 à 3 secondes.

Donc ton hook doit répondre à une seule question dans la tête du spectateur :

> “Pourquoi je devrais m’arrêter ici ?”

Si tu n’as pas de réponse immédiate à ça, la vidéo est morte.

Un bon hook peut être :

* une phrase choc
* une vérité que les gens n’aiment pas entendre
* une promesse claire
* une question qui touche un problème réel

Mais surtout, le hook doit être **lié à ton audience et à ton produit**.
Parce que si tu attires les mauvaises personnes, même avec une bonne vidéo, tu ne vendras rien.

---

## 2. Le corps de la vidéo : là où tu construis la valeur

Une fois que tu as capté l’attention, le vrai travail commence.

Et c’est ici que beaucoup échouent.

Le corps de la vidéo, ce n’est pas “parler pour parler”.
Ce n’est pas remplir du temps.

C’est un moment où tu dois donner quelque chose de réel.

Tu as trois choix principaux :

* enseigner quelque chose
* expliquer une idée
* raconter une histoire (storytelling)

But dans tous les cas, il doit y avoir une intention claire : **apporter de la valeur**.

Pourquoi c’est si important ?

Parce que c’est à ce moment-là que les gens décident inconsciemment si tu es :

* quelqu’un d’intéressant
* quelqu’un de crédible
* quelqu’un à suivre

Et si tu n’apportes rien, ils partent.

C’est aussi simple que ça.

---

## 3. Le CTA : transformer l’attention en action

Le CTA (Call To Action), c’est le moment où tu guides la personne vers la suite.

Ça peut être :

* cliquer sur un lien
* rejoindre une communauté
* découvrir un produit
* ou simplement suivre ton compte

Mais il y a une erreur énorme que beaucoup font :
ils veulent vendre trop vite.

Et c’est là que TikTok te pénalise de deux façons :

1. Tu perds la confiance des gens (car ils ne te connaissent pas encore)
2. Tu réduis tes chances de conversion

Parce qu’une vérité est simple :
**les gens n’achètent pas au premier contact, ils achètent après confiance.**

Donc au début, ton objectif n’est pas de vendre.

Ton objectif est de :

* créer une audience
* créer une relation
* créer de la crédibilité

Ensuite seulement, ton CTA devient puissant.

---

## Conclusion importante

Une vidéo virale, ce n’est pas un montage compliqué.

C’est une structure simple :

* Hook = attirer l’attention
* Corps = donner de la valeur
* CTA = guider l’action

Mais derrière cette simplicité, il y a une logique profonde :

👉 comprendre comment un humain pense, ressent et décide.

Et si tu maîtrises ça, alors TikTok ne devient plus une plateforme de hasard…
mais un véritable levier de croissance pour ton business.

**Bienvenue dans une autre manière de créer du contenu.**

---

## 🔑 10 modèles de hooks universels (adaptables à toutes les niches)

* « La plupart des personnes qui veulent **[X]** font cette erreur… »
* « Si tu cherches à **[X]**, écoute bien ce qui suit. »
* « Personne ne t’explique vraiment comment **[X]**. »
* « J’aurais aimé connaître cette astuce avant de commencer à **[X]**. »
* « 90 % des gens échouent à **[X]** pour une raison très simple. »
* « Arrête de faire ça si ton objectif est de **[X]**. »
* « Voici le conseil qui a complètement changé ma façon de **[X]**. »
* « Si tu es **[profil du public cible]**, cette vidéo est faite pour toi. »
* « En moins de 30 secondes, je vais te montrer comment **[X]**. »
* « Avant de **[X]**, tu dois absolument comprendre ceci. »

### Comment utiliser ces modèles ?
Remplace simplement **[X]** par l'objectif ou le problème de ton audience.

**Exemples :**
* 🪙 **Finance :** « La plupart des personnes qui veulent gagner de l’argent en ligne font cette erreur… »
* 🏃‍♂️ **Sport :** « Si tu cherches à perdre du poids, écoute bien ce qui suit. »
* 🧘 **Développement personnel :** « Personne ne t’explique vraiment comment rester discipliné. »
* 📚 **Études :** « Avant de préparer tes examens, tu dois absolument comprendre ceci. »
* 💼 **Entrepreneuriat :** « 90 % des entrepreneurs débutants échouent pour une raison très simple. »

L'objectif d'un hook est de capter immédiatement l'attention et de donner envie au spectateur de regarder la suite de la vidéo.

---

## 🎯 Un point essentiel à retenir

La réussite sur TikTok ne dépend pas uniquement de la qualité de votre produit. Elle dépend surtout de la valeur que vous apportez à votre audience.

Chaque vidéo doit apprendre quelque chose à la personne qui la regarde. Elle doit lui donner un conseil utile, une astuce, une nouvelle façon de réfléchir ou une information qu'elle pourra réellement utiliser.

Posez-vous toujours cette question avant de publier :
> **« Si quelqu'un regarde cette vidéo sans acheter mon produit, est-ce qu'il en retire quand même quelque chose d'utile ? »**

Si la réponse est oui, vous êtes sur la bonne voie.

### Pourquoi est-ce si important ?
Parce que les gens suivent les créateurs qui les aident. Lorsqu'une personne reçoit régulièrement du contenu de qualité, elle développe progressivement de la confiance envers vous. Et cette confiance est l'un des éléments les plus importants pour convertir un simple spectateur en client.

---

## 🛑 Évitez de vendre dès les premières vidéos

Pendant vos premières publications, il est recommandé de vous concentrer avant tout sur la création de contenu de qualité et sur l'apport de valeur à votre audience.

Évitez de terminer systématiquement vos premières vidéos par un appel à acheter un produit ou à cliquer sur un lien. L'objectif initial est de montrer votre expertise, de créer de l'intérêt et de fidéliser votre communauté.

Une fois que votre compte commence à publier régulièrement du contenu utile et à attirer une audience, vous pourrez intégrer progressivement des appels à l'action (CTA) de manière naturelle.

### Construisez une relation avant de chercher une vente
Rappelez-vous cette règle d'or :
**Valeur ➔ Confiance ➔ Vente.**

Plus votre audience apprend grâce à vous, plus elle aura envie de revenir voir vos vidéos. Et plus elle vous fera confiance, plus elle sera susceptible de suivre vos recommandations lorsqu'un produit répondra réellement à ses besoins.`,
    introspection: "Quel type d'apport de valeur (éducatif, explicatif ou storytelling) vous semble le plus naturel à produire pour votre audience ?",
    exerciseType: "text",
    exerciseId: "fm_creation_content_exercise",
    exerciseLabel: "Rédigez un exemple complet d'une idée de vidéo (Hook de 3s, Valeur du corps, et CTA final) :",
    analogy: "La création de contenu est comme une conversation de salon : si vous hurlez sans intérêt, les gens fuient. Si vous écoutez leurs problèmes et apportez une solution avec humilité, ils s'asseyent autour de vous pour écouter.",
    example: "Hook : 'Voici l'erreur à 500$ que 95% des débutants font en dropshipping...'. Corps : Expliquez brièvement l'erreur (pas de calcul de marge brute) et montrez la formule correcte. CTA : 'Clique sur le lien dans ma bio pour obtenir mon guide gratuit.'"
  },
  {
    id: "fm_chap8",
    title: "Chapitre 8 : Créer du contenu grâce à l'intelligence artificielle",
    subtitle: "Démultiplier votre productivité avec l'IA et HeyGen",
    content: `Bienvenue dans ce nouveau chapitre consacré à la création de contenu avec l'intelligence artificielle.

Aujourd'hui, l'intelligence artificielle est devenue un outil incontournable pour les créateurs de contenu. Elle permet de gagner énormément de temps, de produire des vidéos plus rapidement et surtout de créer des scripts beaucoup plus performants, même si vous débutez.

Dans cette formation, nous allons utiliser **HeyGen**, une plateforme qui permet de créer des vidéos professionnelles avec des avatars générés par l'intelligence artificielle.

Je vous recommande de télécharger directement l'application **HeyGen** depuis le **Play Store** ou l'**App Store**. L'utilisation est généralement plus simple et plus fluide que sur un navigateur web.

Le lien officiel de la plateforme est disponible juste en dessous de cette vidéo.

---

## Pourquoi utiliser l'intelligence artificielle ?

Beaucoup de personnes pensent qu'il faut être un excellent copywriter pour écrire une publicité qui vend.

Ce n'est plus le cas.

Aujourd'hui, grâce à l'intelligence artificielle, vous pouvez obtenir en quelques secondes des scripts de très grande qualité.

Mais il y a une règle extrêmement importante à retenir :

> **La qualité de la réponse dépend directement de la qualité de votre demande.**

Plus vous donnez d'informations à l'IA, plus elle sera capable de produire un résultat précis, convaincant et adapté à votre audience.

C'est exactement pour cette raison que je vous ai préparé un prompt professionnel.

---

## Le prompt à utiliser

[gdrive-video] https://drive.google.com/file/d/1aSERqNJ7FxquRU_-RW08iZ_pdXpeduee/view?usp=sharing

Sous cette vidéo, vous trouverez le prompt suivant. L'objectif est de le copier, de remplacer les informations entre parenthèses par les vôtres, puis de le donner à ChatGPT (ou un autre outil d'IA) pour qu'il vous génère automatiquement le script exact de votre vidéo.

### 🎯 Quel est l'objectif de ce prompt ?
Ce prompt a un but très précis : **générer à votre place un script de vente de 20 à 25 secondes ultra-rythmé**. L'IA va structurer votre texte avec un Hook percutant, l'exposition d'un problème réel, la présentation de votre produit comme solution, et un CTA clair. C'est ce script généré que vous utiliserez ensuite dans l'étape suivante pour faire parler votre avatar sur **HeyGen** !

\`\`\`text
Tu es l'un des meilleurs copywriters spécialisés en Facebook Ads et en psychologie de vente. Ta mission est d'écrire une publicité vidéo Facebook qui arrête immédiatement le scroll, retient l'attention jusqu'à la fin et maximise les conversions.

Produit : (Indique ici le nom de ton produit ou de ton service.)

Public cible : (Décris précisément ton client idéal : son âge, sa situation, ses objectifs, ses difficultés, ses peurs et ce qu'il recherche.)

Objectif : (Indique l'action que tu veux que la personne réalise : acheter, s'inscrire, réserver un appel, télécharger un ebook, etc.)

⚠️ La vidéo doit durer entre 20 et 25 secondes maximum. Le script doit être très rythmé, aller droit au but et ne contenir aucun mot inutile. Chaque seconde doit capter l'attention et donner envie de continuer à regarder.

Respecte impérativement cette structure :

1. Une accroche extrêmement percutante dans les 3 premières secondes pour arrêter le scroll.
2. Présente le principal problème ou besoin de l'audience et fais-lui ressentir qu'elle est comprise.
3. Introduis naturellement le produit ou le service comme la solution.
4. Explique le principal bénéfice ou la transformation que le client obtiendra.
5. Termine par un appel à l'action puissant qui indique exactement ce que le spectateur doit faire.

Consignes importantes :
- Écris comme un humain, pas comme une publicité.
- Utilise des phrases très courtes et dynamiques.
- Une phrase = une idée.
- Chaque phrase doit donner envie d'entendre la suivante.
- Crée de la curiosité et de l'émotion.
- Mets l'accent sur les bénéfices et la transformation plutôt que sur les caractéristiques du produit.
- Ne fais pas de promesses irréalistes ou impossibles à garantir.
- Le ton doit être naturel, convaincant et énergique.
- Adapte le niveau de langage au public cible.
- Génère uniquement le script final, sans explication, sans titres, sans numérotation et sans indications de mise en scène.
\`\`\`

---

## Comment bien utiliser ce prompt ?

Ne vous contentez pas de remplacer uniquement le nom du produit.

Prenez le temps de remplir correctement chaque partie.

Plus vous décrivez précisément votre produit, votre client idéal et votre objectif, plus le script généré sera performant.

Rappelez-vous que l'intelligence artificielle ne devine pas ce que vous pensez. Elle travaille uniquement avec les informations que vous lui fournissez.

Un prompt bien rempli peut faire toute la différence entre une publicité qui passe inaperçue et une publicité qui capte immédiatement l'attention et donne envie d'acheter.

L'intelligence artificielle est un accélérateur. Elle vous fait gagner du temps, mais c'est la qualité des informations que vous lui donnez qui déterminera la qualité du résultat final.

Dans le prochain chapitre, nous passerons directement à la création de votre première vidéo avec HeyGen.`,
    introspection: "Quelle partie du prompt pensez-vous être la plus décisive pour générer une vidéo de vente irrésistible (le produit, le public cible, ou l'objectif) ?",
    exerciseType: "text",
    exerciseId: "fm_ia_creation_exercise",
    exerciseLabel: "Rédigez la partie 'Public cible' de votre prompt telle que vous allez la copier dans ChatGPT :",
    analogy: "L'intelligence artificielle est comme une voiture de course de Formule 1 : elle a une puissance incroyable, mais si le pilote ne sait pas dans quelle direction tourner le volant (le prompt), elle finira dans le décor.",
    example: "Public cible : 'Femme active de 30-45 ans, mère de famille débordée, qui souhaite reprendre le sport à domicile mais qui a moins de 20 minutes par jour, qui culpabilise de ne pas prendre soin d'elle et qui cherche une solution ultra-rapide.'"
  },
  {
    id: "fm_chap9",
    title: "Chapitre 9 : La méthode 100 % gratuite",
    subtitle: "Créer votre premier avatar vidéo sans débourser un centime",
    content: `Le lien officiel de l'outil à utiliser est disponible ici : **[Google Flow AI (Labs)](https://labs.google/fx/tools/flow)**

Bienvenue dans cette deuxième partie de la formation.

Cette méthode est destinée à toutes les personnes qui ne peuvent pas encore investir dans un abonnement à un outil d'intelligence artificielle comme celui présenté dans la partie précédente.

Ne pensez surtout pas que parce qu'elle est gratuite, cette méthode est moins efficace. Au contraire, elle peut vous permettre d'obtenir d'excellents résultats. La principale différence est qu'elle vous demandera davantage de temps, de patience et d'implication.

Avec la méthode payante, une grande partie du processus est automatisée, ce qui permet de créer du contenu beaucoup plus rapidement.

Avec cette méthode gratuite, certaines étapes devront être réalisées manuellement. Vous devrez utiliser plusieurs outils, effectuer quelques manipulations supplémentaires et consacrer un peu plus de temps à la création de vos vidéos.

C'est donc un échange simple :

* Vous économisez de l'argent.
* En contrepartie, vous investissez davantage de votre temps.

Si aujourd'hui votre budget est limité, cette méthode est une excellente alternative pour commencer immédiatement sans attendre.

L'important n'est pas de disposer des meilleurs outils, mais de passer à l'action avec les moyens que vous avez aujourd'hui.

---

## Le prompt à utiliser pour Google Flow AI

[gdrive-video] https://drive.google.com/file/d/1ns0a0d6loZLPBhlcHfmj_yl0rzlHrWDa/view?usp=drive_link

**⚠️ Attention :** Ce prompt n'est pas fait pour ChatGPT ! Il est spécifiquement conçu pour **Google Flow AI** afin de générer l'environnement visuel et l'animation de votre avatar vidéo. 

### 🎯 Quel est l'objectif de ce prompt ?
Ce prompt sert à **décrire précisément à l'intelligence artificielle de Google Flow AI la scène, le personnage, son style d'expression, sa posture et l'éclairage de votre vidéo**. Il vous suffit de copier l'intégralité de ce bloc de code, de le coller dans Google Flow AI, et de remplacer uniquement la ligne **"texte": "COLLER ICI LE SCRIPT QUE L'AVATAR DOIT DIRE."** par le script généré au chapitre précédent.

\`\`\`json
{
  "scène": {
    "lieu": "Bureau moderne, élégant et minimaliste",
    "arrière_plan": "Un espace de travail premium avec une bibliothèque discrète, quelques plantes, un éclairage chaleureux, une décoration moderne et une ambiance professionnelle. Les couleurs sont chaudes, accueillantes et inspirent la confiance.",
    "caméra": {
      "plan": "Plan poitrine",
      "angle": "Face à la caméra, hauteur des yeux",
      "mouvement": "Très léger mouvement cinématographique, fluide et naturel",
      "mise_au_point": "Le visage est parfaitement net avec un arrière-plan légèrement flou pour un effet professionnel."
    }
  },
  "personnage": {
    "genre": "Homme",
    "origine": "Africain",
    "teint": "Noir à teint clair",
    "âge": "22 à 27 ans",
    "apparence": {
      "visage": "Jeune, charismatique, souriant, naturel et inspirant confiance.",
      "coiffure": "Cheveux courts, propres et modernes.",
      "barbe": "Légère barbe bien entretenue.",
      "yeux": "Regard confiant dirigé vers la caméra.",
      "tenue": "Chemise noire ajustée sous une veste beige ou bleu marine, style business casual."
    },
    "position": "Assis confortablement sur une chaise derrière un bureau moderne.",
    "posture": "Droite, détendue et assurée.",
    "gestes": "Gestes naturels des mains pendant qu'il parle."
  },
  "objets": {
    "bureau": "Bureau moderne en bois.",
    "ordinateur": "Ordinateur portable ouvert placé devant lui.",
    "accessoires": "Quelques accessoires discrets et élégants, espace propre et organisé."
  },
  "animation": {
    "mouvements_des_lèvres": "Synchronisés parfaitement avec le texte fourni.",
    "mouvements_de_la_tête": "Naturels et réalistes.",
    "clignement_des_yeux": "Naturel.",
    "expressions_du_visage": "Engageantes, confiantes et authentiques.",
    "langage_corporel": "Calme, professionnel et convaincant."
  },
  "éclairage": {
    "style": "Cinématographique",
    "ambiance": "Lumière chaude, douce et premium avec des tons dorés créant une atmosphère accueillante, luxueuse et inspirante."
  },
  "vidéo": {
    "résolution": "4K Ultra HD",
    "format": "9:16",
    "durée": "20 à 25 secondes",
    "images_par_seconde": 30,
    "qualité": "Ultra réaliste, photoréaliste, niveau cinéma."
  },
  "audio": {
    "langue": "Français",
    "prononciation": "Français naturel, fluide et parfaitement compréhensible.",
    "style_de_voix": "Professionnel, chaleureux, confiant et dynamique.",
    "musique": "Aucune.",
    "effets_sonores": "Aucun.",
    "bruit_ambiant": "Aucun."
  },
  "dialogue": {
    "texte": "COLLER ICI LE SCRIPT QUE L'AVATAR DOIT DIRE."
  },
  "style": {
    "rendu": "Ultra réaliste, photoréaliste, cinématographique.",
    "objectif": "Créer un avatar crédible, professionnel et inspirant, comme un jeune entrepreneur africain qui s'adresse directement à son audience avec assurance.",
    "interdictions": [
      "Aucun texte affiché à l'écran.",
      "Aucun logo.",
      "Aucun filigrane.",
      "Aucune musique.",
      "Aucun bruit de fond.",
      "Aucun effet sonore.",
      "Aucun autre personnage."
    ]
  }
}
\`\`\`

## Pourquoi ce prompt est-il important ?

Ce prompt ne sert pas simplement à créer un avatar. Il permet à l'intelligence artificielle de comprendre précisément l'environnement, le personnage, les mouvements, l'éclairage, le style de voix et la qualité de la vidéo que vous souhaitez obtenir.

En utilisant toujours ce même prompt, vous garderez une identité visuelle cohérente sur l'ensemble de vos vidéos. Votre contenu paraîtra plus professionnel, plus crédible et inspirera davantage confiance auprès de votre audience.

Il ne vous restera plus qu'à remplacer le texte du dialogue par votre propre script avant de générer la vidéo.

---

## 💳 Cartes virtuelles et plateformes de paiement recommandées par pays

Pour utiliser les outils présentés et configurer vos campagnes publicitaires, vous aurez besoin d'une carte de débit internationale (Visa ou Mastercard). Voici les meilleures solutions de cartes virtuelles fiables, rechargeables directement via Mobile Money :

### 🇨🇲 Cameroun
* **PaySika** : [Accéder à PaySika](https://paysika.co/cm)
* **Neero** : [Accéder à Neero](https://neero.io/fr)

### 🇨🇮 Côte d'Ivoire & 🇸🇳 Sénégal
* **Djamo** : [Accéder à Djamo](https://www.djamo.com/)

### 🇨🇩 République Démocratique du Congo
* **Vaultpay** : [Accéder à Vaultpay](https://www.vaultpay.io/)

### 🇹🇬 Togo
* **Solimi** : [Accéder à Solimi](https://solimi.co)

### 🌍 Disponibilité régionale (Multi-pays)
* **Payool** : [Accéder à Payool](https://www.payool.net/) — Opère dans plusieurs pays d'Afrique francophone, offrant des cartes de débit virtuelles Visa/Mastercard rechargeables par Mobile Money.
* **MyFeda** : [Accéder à MyFeda](https://myfeda.com/) — Disponible au Bénin, Sénégal, Mali, Burkina Faso, Niger, Togo, etc.`,
    introspection: "Pensez-vous qu'une identité visuelle stable et cohérente (grâce à ce prompt) puisse compenser l'effort supplémentaire que demande la méthode gratuite ?",
    exerciseType: "text",
    exerciseId: "fm_free_method_exercise",
    exerciseLabel: "Rédigez l'idée de dialogue que vous allez intégrer à ce prompt pour votre première vidéo d'avatar :",
    analogy: "La méthode gratuite est comme apprendre à cultiver soi-même ses légumes : cela prend plus de temps et d'effort au départ que de les acheter tout prêts, mais vous comprenez chaque étape de la croissance et maîtrisez parfaitement la qualité finale de votre récolte.",
    example: "Dialogue : 'Tu as toujours voulu lancer ton business mais tu manques de temps ? Regarde cette vidéo jusqu'au bout, je te montre comment automatiser 80% de tes tâches en 5 minutes par jour !'"
  },
  {
    id: "fm_chap10",
    title: "Chapitre 10 : Comprendre le fonctionnement de la publicité avec WhatsApp Business",
    subtitle: "Le parcours complet d'un prospect vers l'achat",
    content: `Bienvenue dans ce nouveau chapitre.

Jusqu'à présent, vous avez appris à choisir un produit, à créer du contenu et à réaliser des vidéos publicitaires. Maintenant, il est temps de comprendre comment transformer ces vidéos en ventes grâce à la publicité.

Avant de lancer votre première campagne, il est essentiel de comprendre le fonctionnement de tout le processus. Beaucoup de débutants dépensent de l'argent sans réellement savoir ce qui se passe derrière une publicité. Résultat : ils perdent leur budget parce qu'ils ne comprennent pas comment fonctionne le parcours d'un client.

À la fin de ce chapitre, vous saurez exactement ce qui se passe entre le moment où une personne voit votre publicité et le moment où elle achète votre produit.

---

## Vidéo explicative de la publicité WhatsApp Business

Regardez attentivement cette vidéo d'introduction pour bien comprendre tout le fonctionnement du système publicitaire avant de poursuivre la lecture de ce chapitre :

[gdrive-video] https://drive.google.com/file/d/1koEhMOoG_8cUYO0Pfmd77PLQim9SJ4FH/view?usp=sharing

---

## Comment fonctionne la publicité ?

Une publicité est simplement un moyen de montrer votre vidéo à des personnes qui sont susceptibles d'être intéressées par votre produit.

Au lieu d'attendre que votre vidéo devienne virale naturellement, vous payez Facebook pour qu'il la montre directement à une audience ciblée.

Cela permet d'obtenir des résultats beaucoup plus rapidement.

---

## Le principe de facturation

Lorsque vous lancez une publicité, Facebook ne vous facture pas à chaque vente.

Dans la majorité des cas, vous payez principalement pour la diffusion de votre publicité, c'est-à-dire pour le nombre de personnes qui la voient.

De manière générale, **1 dollar de budget publicitaire permet souvent d'obtenir plusieurs centaines de vues, parfois entre 500 et 1 000 vues**, selon différents facteurs comme le pays ciblé, la concurrence, la qualité de votre publicité et votre audience. Ce chiffre est donc une estimation et peut varier d'une campagne à l'autre.

Par exemple :

* Si votre audience est très concurrentielle, le coût peut être plus élevé.
* Si votre publicité est pertinente et que les personnes interagissent avec elle, Facebook peut réduire le coût de diffusion.
* Le pays que vous ciblez influence également le prix. Certaines audiences coûtent plus cher que d'autres.

C'est pour cette raison qu'il est important de ne pas regarder uniquement le coût de la publicité, mais surtout les résultats qu'elle génère.

---

## Le parcours complet d'un client

Pour bien comprendre, imaginons le parcours d'une personne qui découvre votre publicité.

### Étape 1 : Le client voit votre publicité

Tout commence lorsque Facebook affiche votre vidéo dans le fil d'actualité d'une personne correspondant à votre audience cible.

À ce stade, cette personne ne vous connaît probablement pas.

Votre mission est donc de capter immédiatement son attention grâce à une accroche efficace.

---

### Étape 2 : Le client regarde votre vidéo

Si votre vidéo est intéressante, le spectateur continue de regarder.

Pendant ces quelques secondes, votre objectif est de lui montrer que vous comprenez son problème et que vous avez une solution adaptée.

C'est à ce moment que vous commencez à créer de la confiance.

---

### Étape 3 : Le client clique sur le bouton situé sous la publicité

À la fin de votre publicité, Facebook affiche automatiquement un bouton d'action (CTA) sous la vidéo. Selon la configuration de votre campagne, ce bouton permet au spectateur d'ouvrir directement une conversation avec vous sur WhatsApp Business.

Les personnes réellement intéressées par votre offre cliqueront naturellement sur ce bouton pour obtenir plus d'informations.

Ce clic agit comme un premier filtre. Toutes les personnes qui voient votre publicité ne seront pas intéressées, mais celles qui prennent l'initiative de cliquer montrent déjà un véritable intérêt pour votre produit.

Autrement dit, lorsque quelqu'un clique sur ce bouton, vous savez qu'il est suffisamment curieux ou intéressé pour vouloir en savoir davantage. Vous allez donc échanger uniquement avec des personnes beaucoup plus qualifiées que si vous contactiez des personnes au hasard.

---

### Étape 4 : La conversation commence sur WhatsApp Business

Une fois que le client clique sur le bouton, il est automatiquement redirigé vers votre conversation WhatsApp Business.

À partir de ce moment, vous pouvez échanger directement avec lui.

Vous pouvez répondre à ses questions, lever ses éventuelles objections et mieux comprendre ses besoins.

Cette étape est importante, car toutes les personnes qui cliquent ne sont pas prêtes à acheter immédiatement. Certaines auront simplement besoin de quelques informations supplémentaires avant de prendre leur décision.

---

### Étape 5 : Vous envoyez le lien de votre produit

Lorsque le client montre un réel intérêt, vous pouvez lui envoyer le lien vers votre produit.

À ce stade, il ne s'agit plus d'un simple visiteur : c'est un prospect qualifié, c'est-à-dire une personne qui a manifesté un intérêt concret pour votre offre.

C'est pourquoi le taux de conversion est souvent meilleur qu'avec un simple lien envoyé à tout le monde.

---

### Étape 6 : Le client passe à l'achat

Si toutes les étapes précédentes ont été bien réalisées, le client effectue son achat.

Le processus est alors terminé.

---

## Ce qu'il faut retenir

Une publicité ne consiste pas uniquement à diffuser une vidéo.

C'est un véritable parcours qui accompagne progressivement une personne jusqu'à l'achat.

Le schéma est très simple :

**Publicité Facebook → Visionnage de la vidéo → Clic sur le CTA → Conversation sur WhatsApp Business → Envoi du lien du produit → Achat.**

Chaque étape a son importance.

Si votre vidéo n'attire pas l'attention, les personnes ne regarderont pas votre publicité.

Si votre CTA n'est pas clair, elles ne cliqueront pas.

Si votre conversation WhatsApp n'inspire pas confiance, elles n'achèteront pas.

Autrement dit, chaque étape influence directement la suivante.

Plus vous optimisez chacune de ces étapes, plus vous augmentez vos chances de transformer un simple spectateur en client.`,
    introspection: "Quelle étape du parcours client (la vidéo publicitaire, le clic sur le CTA, ou la conversation WhatsApp) vous semble la plus délicate à optimiser dans votre propre activité ?",
    exerciseType: "text",
    exerciseId: "fm_whatsapp_ads_exercise",
    exerciseLabel: "Décrivez comment vous prévoyez d'accueillir vos premiers clients sur WhatsApp Business :",
    analogy: "La publicité payante est comme un escalator moderne et rapide : elle vous propulse vers le haut (vos objectifs de vente) à toute vitesse, contrairement aux escaliers classiques de l'organique qui demandent un effort constant marche après marche.",
    example: "Accueil : 'Bonjour ! Merci pour votre intérêt pour notre produit. Je suis ravi de vous aider et de répondre à toutes vos questions...'"
  }
];

/*
// Structured Masterclass Data matching OCR/PDF exactly
const MODULE_SECTIONS = [
  {
    id: "intro",
    title: "Introduction",
    subtitle: "Le Pouvoir Invisible de Votre Mindset",
    content: `Bienvenue dans le premier chapitre de votre voyage vers la Mindset Millionaire Zone. Ce n’est pas un simple livre que vous tenez entre les mains, mais un guide de formation intensif, conçu pour transformer radicalement votre approche de la réussite, de la richesse et de l’épanouissement personnel. Oubliez les recettes miracles et les solutions éphémères. Ici, nous allons plonger au cœur de ce qui façonne véritablement votre réalité : votre mindset.

Le terme « mindset » est souvent utilisé, parfois galvaudé, mais sa profondeur et son impact sont rarement pleinement compris. Il ne s’agit pas d’une simple pensée positive ou d’une attitude passagère. Votre mindset est l’ensemble de vos croyances profondes, de vos valeurs ancrées, de vos hypothèses inconscientes et de vos schémas de pensée habituels qui filtrent la réalité et dictent vos réactions face aux événements. C’est votre système d’exploitation interne, celui qui détermine la qualité de votre expérience de vie et l’étendue de vos réalisations.`,
    analogy: "Votre mindset est comme la lentille invisible d'une paire de lunettes qui colore chaque expérience, chaque défi, chaque opportunité.",
    example: "Imaginez deux individus face à un échec cuisant. Le premier y voit une confirmation de son incompétence et abandonne. Le second y perçoit une leçon précieuse, une opportunité d'ajuster sa stratégie, et persévère avec une détermination renouvelée. La différence réside uniquement dans le mindset qui interprète l'événement.",
    deepDive: "Ce chapitre est dédié à la reprogrammation mentale. Nous allons déconstruire les mécanismes de votre mindset actuel, identifier les programmes limitants qui tournent en arrière-plan, et vous fournir les outils pour installer un nouveau système d'exploitation : celui d'un Millionaire Mindset, caractérisé par la discipline, la persévérance et l'amélioration continue.",
    introspection: "Quelles sont les attentes et les craintes inconscientes qui dictent vos actions aujourd'hui ? Êtes-vous prêt à faire face à votre monde intérieur ?",
    exerciseType: "text",
    exerciseId: "intro_insight",
    exerciseLabel: "Notez vos motivations profondes et ce que vous attendez de cette reprogrammation mentale :"
  },
  {
    id: "section_1",
    title: "1. Pourquoi le mindset influence les choix",
    subtitle: "Le Mindset comme Système d’Exploitation Personnel",
    content: `Le mindset est le moteur silencieux de toutes vos actions et décisions. Il agit comme un filtre perceptif qui détermine comment vous interprétez le monde, comment vous réagissez aux défis et comment vous vous projetez dans l’avenir. Comprendre cette influence est la première étape cruciale pour reprendre le contrôle de votre destinée.

Pour saisir l’ampleur de l’influence du mindset, imaginez-le comme le système d’exploitation (OS) de votre cerveau. Tout comme un ordinateur ne peut fonctionner sans un OS, votre esprit ne peut traiter les informations, prendre des décisions ou initier des actions sans son propre système sous-jacent. Cet OS personnel est composé de toutes les informations, expériences, croyances et apprentissages que vous avez accumulés depuis votre naissance.

Ce système d’exploitation n’est pas neutre. Il est programmé par votre éducation, votre environnement social, vos expériences passées, les messages que vous avez reçus de vos parents, de vos professeurs, de vos amis, des médias, et même de la culture ambiante. Chaque interaction, chaque succès, chaque échec a contribué à écrire une ligne de code dans ce programme interne.`,
    analogy: "Votre mindset est comme les lunettes que vous portez. Si elles sont teintées de pessimisme, le monde entier vous paraîtra sombre. Si elles sont claires et optimistes, vous verrez des opportunités même dans l'adversité.",
    example: "Prenons deux entrepreneurs. Le premier, avec un mindset de rareté, se concentre sur la réduction de coûts, hésite à investir et panique face à la concurrence. Le second, avec un mindset d'abondance, investit dans la qualité, cherche des partenariats et voit la concurrence comme un stimulant.",
    deepDive: "Lorsque vous faites face à une situation, votre cerveau applique instantanément les filtres du mindset. Si vous êtes programmé pour la peur de l'échec, une opportunité sera perçue comme une menace directe.",
    introspection: "Quelles sont les couleurs dominantes de vos lunettes actuelles ? Comment influencent-elles votre perception des opportunités ?",
    exerciseType: "text",
    exerciseId: "glasses_color",
    exerciseLabel: "Décrivez la couleur de vos 'lunettes mentales' actuelles (Peur, Prudence, Opportunité, Abondance, etc.) et comment elles filtrent vos projets :"
  },
  {
    id: "section_1_2",
    title: "1.2. Le Cycle Pensée-Émotion-Action-Résultat",
    subtitle: "La boucle de rétroaction du comportement",
    content: `L’influence du mindset ne se limite pas à la perception. Elle s’inscrit dans un cycle puissant et souvent inconscient qui détermine l’intégralité de votre expérience et de vos résultats. Ce cycle peut être schématisé comme suit :

Pensées → Émotions → Actions → Résultats

1. Pensées : Tout commence par vos pensées, qui sont directement influencées par votre mindset. Vos croyances façonnent ce que vous pensez d'une situation.
2. Émotions : Vos pensées génèrent des émotions. Penser que vous allez échouer génère de l'anxiété. Penser que vous êtes capable génère de la détermination.
3. Actions : Vos émotions dictent vos actions. La peur paralyse, tandis que la confiance pousse à agir et à persévérer.
4. Résultats : Vos actions produisent des résultats. Des actions cohérentes et alignées mènent au succès.

Ce cycle est une boucle de rétroaction. Les résultats que vous obtenez renforcent vos pensées initiales, créant ainsi un cercle vertueux ou vicieux.`,
    example: "Marie doute de ses compétences en marketing (pensée). Cela génère de la peur et de l'anxiété (émotion). Elle retarde son lancement et ne fait aucune publicité (action). Son produit ne se vend pas (résultat), ce qui renforce sa croyance de base. À l'inverse, Marc y voit une chance d'apprendre, lance vite, récolte du feedback, et ajuste jusqu'au succès progressif.",
    introspection: "Pendant les prochaines 24 heures, observez une émotion forte. Pouvez-vous remonter à la pensée automatique qui l'a provoquée ?",
    exerciseType: "text",
    exerciseId: "cycle_reflection",
    exerciseLabel: "Identifiez une situation récente où un doute (Pensée) a paralysé votre initiative (Action). Comment auriez-vous pu briser cette boucle ?"
  },
  {
    id: "section_1_3",
    title: "1.3. Impact sur la Discipline et la Persévérance",
    subtitle: "Les trois piliers essentiels de la réussite à long terme",
    content: `Le mindset est le fondement sur lequel se construisent la discipline, la persévérance et l’amélioration continue, trois piliers essentiels de la réussite à long terme. Sans un mindset adéquat, ces qualités sont impossibles à maintenir.

• Discipline : Un mindset orienté vers la croissance perçoit la discipline non comme une contrainte, mais comme un moyen d'atteindre la liberté. La pensée « Chaque petite action compte » nourrit la discipline.
• Persévérance : Face aux obstacles, un mindset de croissance voit les difficultés comme des opportunités de se renforcer. Un mindset fixe voit l'échec comme une preuve d'incompétence et pousse à l'abandon.
• Amélioration Continue : La conviction que vos compétences se développent par l'effort (concept de Growth Mindset de Carol Dweck) vous pousse à sortir de votre zone de confort.`,
    deepDive: "Plan d'action immédiatement applicable : Identifiez un domaine à améliorer. Engagez-vous pour les 7 prochains jours à une petite action quotidienne de 5 minutes (ex: méditer 5 minutes pour la discipline, lire un article éducatif pour l'amélioration continue).",
    exerciseType: "text",
    exerciseId: "discipline_plan",
    exerciseLabel: "Quelle petite action de 5 minutes allez-vous réaliser quotidiennement durant les 7 prochains jours ?"
  },
  {
    id: "section_2",
    title: "2. Les Croyances Limitantes",
    subtitle: "Comment elles se forment et comment les identifier",
    content: `Les croyances limitantes sont des convictions profondes que nous tenons pour vraies à propos de nous-mêmes, des autres ou du monde, et qui nous empêchent d’atteindre notre plein potentiel. Elles agissent comme des chaînes invisibles.

Ces croyances se forment à partir de plusieurs sources :
• Expériences Passées : Un échec passé qui est généralisé comme une vérité immuable (« Je ne suis pas doué pour cela »).
• Messages Reçus : Les jugements de figures d’autorité reçus durant l'enfance (« L'argent ne pousse pas sur les arbres », « Ce n'est pas pour nous »).
• Observation et Modélisation : L'imitation de notre entourage qui craignait l'échec ou stigmatisait la réussite.
• Culture et Société : Les stéréotypes et normes sociales.
• Interprétation des Événements : Notre cerveau tire des conclusions subjectives et crée des raccourcis mentaux pour économiser son énergie.`,
    analogy: "Les croyances limitantes sont comme des virus informatiques qui tournent en arrière-plan. Ils consomment votre énergie et ralentissent vos performances sans que vous ne les voyiez.",
    introspection: "Quelles sont les phrases négatives que vous vous répétez souvent lorsque vous envisagez de lancer un nouveau projet ambitieux ?",
    exerciseType: "beliefs_list",
    exerciseId: "beliefs_tracker",
    exerciseLabel: "Dressez la liste de vos croyances limitantes et évaluez-les :"
  },
  {
    id: "section_3",
    title: "3. Les Biais Cognitifs & Schémas Limitants",
    subtitle: "Les pièges mentaux qui freinent votre progression",
    content: `Notre esprit est sujet à des biais cognitifs et des schémas de pensée qui altèrent notre jugement rationnel :

• Biais de Confirmation : Tendance à ne chercher et retenir que les informations qui confirment nos croyances préexistantes.
• Biais d'Ancrage : Se fier excessivement à la première information reçue.
• Aversion à la Perte : La douleur de perdre 100€ est ressentie plus fortement que le plaisir d'en gagner 100€. Cela pousse à une prudence excessive.
• Effet Dunning-Kruger : Les moins qualifiés surestiment leurs compétences, tandis que les experts se sous-estiment.
• Pensée Tout ou Rien : Voir les choses en noir ou blanc. Soit c'est un succès parfait, soit c'est un échec total.
• Catastrophisation : Anticiper systématiquement le pire scénario imaginable.`,
    example: "Un investisseur victime du biais de confirmation n'écoutera que les avis positifs sur son action, ignorant les signaux d'alerte, ou refusera de vendre à perte par aversion de la perte, finissant par tout perdre.",
    deepDive: "Pour dépasser ces biais : recherchez activement des preuves contraires, adoptez une pensée critique en posant des questions objectives ('Est-ce absolument vrai ? Quelles sont les preuves réelles ?'), et considérez des perspectives multiples.",
    exerciseType: "text",
    exerciseId: "cognitive_journal",
    exerciseLabel: "Notez un biais cognitif que vous avez identifié chez vous récemment et comment vous comptez le neutraliser :"
  },
  {
    id: "section_4",
    title: "4. L'Identité Personnelle",
    subtitle: "Pourquoi devenir précède toujours l'obtention de résultats",
    content: `La reprogrammation mentale repose sur un concept central : l’identité personnelle. Ce n’est pas seulement ce que vous faites qui compte, mais surtout qui vous croyez être.

Comme le démontre James Clear dans Atomic Habits, le changement le plus durable vient du niveau de l'identité :
• Cohérence Interne : Le cerveau cherche toujours à s'aligner sur son identité perçue. Si vous vous considérez comme paresseux, maintenir une discipline sera un calvaire.
• Votes d'Identité : Chaque action que vous entreprenez est un vote pour le type de personne que vous voulez devenir. Aller au sport est un vote pour une identité saine.

Au lieu de dire « Je veux être riche », dites « Je suis une personne qui crée de la valeur, résout des problèmes et attire naturellement l'abondance ».`,
    analogy: "Votre identité est comme le rôle que vous jouez dans le film de votre vie. Si vous vous voyez comme un figurant, vous agirez comme tel. Si vous vous voyez comme le héros, vous prendrez les initiatives d'un héros.",
    introspection: "Si vous deviez résumer la personne que vous êtes aujourd'hui en une seule phrase, quelle serait-elle ? Correspond-elle à vos ambitions ?",
    exerciseType: "identity_declaration",
    exerciseId: "identity_statement",
    exerciseLabel: "Rédigez votre Déclaration d'Identité Élite (commencez par 'Je suis...')"
  },
  {
    id: "section_5",
    title: "5. Le Dialogue Intérieur",
    subtitle: "L'influence colossale des mots que l'on se répète",
    content: `Le dialogue intérieur est cette conversation constante que vous menez avec vous-même. Il agit comme le scénariste et le réalisateur du film de votre vie.

• Auto-Critique vs Auto-Compassion : Un dialogue négatif détruit l'estime de soi. Un dialogue bienveillant et constructif ('J'ai fait une erreur, mais je peux apprendre') renforce la résilience.
• Prophétie Auto-Réalisatrice : Si vous vous répétez que vous allez échouer, votre subconscient cherchera inconsciemment des comportements menant à cet échec.
Le cerveau ne distingue pas la réalité de ce que vous affirmez avec force. Vos paroles sont des instructions d'exécution pour votre esprit.`,
    analogy: "Votre esprit est un jardin. Si vous y plantez des mauvaises herbes (pensées négatives), il sera envahi. Si vous y plantez de belles fleurs (affirmations positives), votre vie sera florissante.",
    introspection: "Quels sont les mots ou reproches récurrents que votre voix intérieure vous adresse le plus souvent ?",
    exerciseType: "text",
    exerciseId: "inner_dialogue_script",
    exerciseLabel: "Rédigez un 'nouveau script' pour remplacer votre pire pensée négative récurrente :"
  },
  {
    id: "section_6",
    title: "6. Discipline & Constance face aux Émotions",
    subtitle: "Maintenir le cap malgré les turbulences émotionnelles",
    content: `Beaucoup croient à tort qu'être discipliné nécessite une motivation constante. C'est un mythe dangereux. La motivation est fluctuante et éphémère. La discipline, en revanche, est la capacité d'agir en accord avec ses objectifs, même lorsque l'envie et la motivation sont absentes.

Pour gérer vos émotions sans les laisser dicter vos actions :
1. Reconnaître et Nommer : Identifier précisément l'émotion (ex: 'Je ressens de l'anxiété').
2. Observer sans Juger : Observer l'émotion comme un fait scientifique, sans la qualifier de bonne ou de mauvaise.
3. Prendre du Recul : Se rappeler que vous n'êtes pas vos émotions. Elles passent, vous restez.
4. Agir en Cohérence avec vos Valeurs : Poser la question fatidique : 'Quelle action est cohérente avec la personne que je veux devenir ?' et agir malgré l'inconfort.`,
    analogy: "La motivation est le vent qui gonfle temporairement vos voiles. La discipline est le gouvernail métallique solide qui maintient le cap, même en pleine tempête ou en cas de calme plat.",
    introspection: "La prochaine fois que vous ressentirez l'envie de procrastiner, saurez-vous appliquer la méthode 'Reconnaître, Observer, Agir' ?",
    exerciseType: "text",
    exerciseId: "emotion_discipline",
    exerciseLabel: "Notez une tâche importante que vous repoussez par peur ou anxiété, et écrivez comment vous allez l'attaquer pendant seulement 5 minutes :"
  },
  {
    id: "section_7",
    title: "7. Le Rôle des Habitudes Quotidiennes",
    subtitle: "Le pouvoir cumulé des petits gains (Atomic Habits)",
    content: `Les habitudes sont les intérêts composés de l'amélioration de soi. Une amélioration de seulement 1% chaque jour conduit à des résultats exponentiels sur le long terme.

Le cycle de l'habitude est composé de 4 étapes :
1. Déclencheur (Cue) : Le signal visuel ou temporel qui indique une opportunité de récompense.
2. Envie (Craving) : La motivation ou le désir de changer d'état interne.
3. Réponse (Response) : L'action ou l'habitude elle-même.
4. Récompense (Reward) : Le bénéfice qui valide et ancre l'habitude dans le cerveau.

Pour implanter une bonne habitude, rendez-la évidente, attractive, facile (la règle des 2 minutes) et satisfaisante (célébration immédiate).`,
    example: "Lire 10 pages d'un livre par jour ne change rien à votre vie demain. Mais après un an, vous aurez lu plus de 30 livres de développement personnel, transformant définitivement votre niveau d'expertise.",
    exerciseType: "habit_designer",
    exerciseId: "habit_blueprint",
    exerciseLabel: "Concevez votre nouvelle habitude Millionnaire :"
  },
  {
    id: "section_8",
    title: "8. Dépasser la Peur de l'Échec & du Jugement",
    subtitle: "Briser les gardiens invisibles de votre zone de confort",
    content: `Le chemin de l'élite n'est jamais linéaire. Nos peurs internes sont les véritables obstacles :
• Peur de l'Échec : Liée à la peur de la perte et du statut social.
• Peur du Jugement : Liée à notre besoin ancestral d'appartenance et de validation par le groupe.
• Peur de l'Incertitude : Notre cerveau déteste l'imprévisibilité et cherche le contrôle.

Ces peurs sont héritées de notre passé évolutif où le rejet du clan équivalait à une condamnation à mort. Aujourd'hui, ces menaces sont imaginaires mais notre corps réagit avec la même intensité physique.`,
    analogy: "Vos peurs sont comme des gardiens de prison invisibles. Ils vous maintiennent dans une cellule de confort douillette en vous faisant croire que c'est pour votre sécurité, tout en vous privant de liberté.",
    introspection: "Qu'est-ce que vous oseriez accomplir immédiatement si vous aviez la certitude absolue de ne jamais être jugé ni de subir d'échec ?",
    exerciseType: "fear_mapping",
    exerciseId: "fear_map",
    exerciseLabel: "Cartographie de votre peur majeure :"
  },
  {
    id: "section_9",
    title: "9. Apprendre de ses Erreurs & Résilience",
    subtitle: "L'erreur comme source de données précieuses",
    content: `Un mindset de croissance ne voit pas l'erreur comme une sentence finale, mais comme une source d'informations objectives indispensables pour s'ajuster.

Pour apprendre de ses erreurs de manière structurée :
1. Admettre l'erreur sans drama ni victimisation.
2. Analyser objectivement les causes réelles.
3. Extraire les leçons clés à en tirer.
4. Élaborer un plan d'action correctif immédiat.
5. Appliquer et itérer rapidement.

La résilience est cette capacité à rebondir face à l'adversité. Elle se développe en acceptant les difficultés comme faisant partie du voyage et en se concentrant uniquement sur ce que l'on peut contrôler.`,
    example: "Thomas Edison n'a pas échoué 10 000 fois avant d'inventer l'ampoule électrique. Il a affirmé avoir trouvé 10 000 manières qui ne fonctionnaient pas, éliminant pas à pas les erreurs pour parvenir au succès.",
    exerciseType: "text",
    exerciseId: "error_post_mortem",
    exerciseLabel: "Prenez une erreur ou un échec récent. Qu'avez-vous appris objectivement et quelle action corrective appliquez-vous ?"
  },
  {
    id: "section_10",
    title: "10. L'Entourage et la Diète Mentale",
    subtitle: "Vous êtes la moyenne des contenus et des personnes qui vous entourent",
    content: `Votre esprit est façonné par les forces externes. L'adage « vous êtes la moyenne des cinq personnes avec qui vous passez le plus de temps » est scientifiquement prouvé par la contagion émotionnelle et les neurones miroirs.

De même, votre 'Diète Mentale' est cruciale. Consommer des actualités anxiogènes ou du divertissement superficiel empoisonne votre subconscient, tandis que les livres inspirants et les podcasts éducatifs le renforcent.`,
    analogy: "Votre entourage est le sol dans lequel vous êtes planté. S'il est fertile et riche, vous allez croître de manière spectaculaire. S'il est aride et toxique, votre développement sera atrophié.",
    introspection: "Faites l'audit de votre consommation média sur 24h. Quels contenus vous élèvent et lesquels vous drainent votre énergie ?",
    exerciseType: "text",
    exerciseId: "mental_diet",
    exerciseLabel: "Quels sont les 2 types de contenus toxiques ou drainants que vous éliminez dès aujourd'hui ?"
  },
  {
    id: "section_11",
    title: "11. Visualisation & Objectifs SMART",
    subtitle: "Du rêve à la feuille de route stratégique",
    content: `La visualisation créatrice prépare scientifiquement le cerveau à la réussite en activant le Système d'Activation Réticulaire (SAR), qui filtre les opportunités pertinentes.

Mais la visualisation seule ne suffit pas. Elle doit s'accompagner d'objectifs SMART :
• Spécifique : Clair et précis.
• Mesurable : Quantifiable.
• Atteignable : Ambitieux mais réaliste.
• Réaliste : Aligné avec vos valeurs.
• Temporellement défini : Doté d'une date limite ferme.`,
    analogy: "La visualisation est le GPS de votre esprit. Elle définit la destination finale. La planification SMART est la feuille de route qui découpe l'itinéraire en étapes simples et mesurables.",
    exerciseType: "smart_goals",
    exerciseId: "smart_blueprint",
    exerciseLabel: "Définissez votre Objectif SMART pour les 12 prochains mois :"
  },
  {
    id: "section_12",
    title: "12. Rester Motivé sur le Long Terme",
    subtitle: "Alimenter son moteur interne de réussite",
    content: `La motivation externe s'épuise vite. C'est la motivation intrinsèque (plaisir de l'activité, autonomie, sentiment de progression, recherche de sens) qui assure la durabilité de vos efforts.

Pour maintenir l'élan :
• Célébrer les petites victoires : Libère de la dopamine et stimule le circuit de la récompense.
• Suivre visuellement ses progrès (ex: cocher des cases).
• Se connecter à une communauté d'élite partageant la même vision.
• Gérer son énergie physique et mentale (sommeil, nutrition, sport).`,
    introspection: "Quel est votre 'Pourquoi' profond ? Pourquoi voulez-vous atteindre l'indépendance financière ?",
    exerciseType: "text",
    exerciseId: "deep_why",
    exerciseLabel: "Rédigez votre 'Pourquoi' le plus intime et puissant, celui qui vous fera vous lever à 5h du matin :"
  },
  {
    id: "section_13",
    title: "13. Les Exercices de Transformation",
    subtitle: "Boîte à outils de reprogrammation au quotidien",
    content: `La reprogrammation mentale est un entraînement quotidien. Voici les exercices recommandés :

• Méditation de Pleine Conscience : 5 à 10 minutes par jour pour observer vos pensées sans jugement.
• Journal de Gratitude : Noter chaque matin 3 à 5 choses pour lesquelles vous êtes reconnaissant.
• Journal de Réussites : Noter chaque soir 3 réussites de votre journée pour muscler votre confiance.
• Technique du 'Comme Si' : Agir, marcher et décider comme si vous incarniez déjà votre identité idéale.
• Cercle d'Influence : Consacrer 80% de votre énergie à ce que vous pouvez contrôler, et lâcher prise sur le reste.`,
    introspection: "Prenez une minute pour ressentir de la gratitude pour l'opportunité d'apprendre et de vous élever aujourd'hui.",
    exerciseType: "text",
    exerciseId: "gratitude_three",
    exerciseLabel: "Écrivez 3 choses simples pour lesquelles vous êtes profondément reconnaissant aujourd'hui :"
  },
  {
    id: "section_14",
    title: "14. Programme Quotidien de 30 Jours",
    subtitle: "Votre feuille de route pas à pas pour installer le Mindset Millionnaire",
    content: `La transformation réelle s'opère par l'action répétée. Ce programme progressif de 30 jours est votre guide quotidien. Chaque jour, réalisez la tâche désignée pour ancrer durablement cet état d'esprit.

La clé absolue est la constance, pas la perfection. Relevez le défi jour après jour, cochez vos victoires et regardez vos standards s'élever.`,
    exerciseType: "day30_challenge",
    exerciseId: "days_tracker_30",
    exerciseLabel: "Suivez votre progression quotidienne et relevez le défi des 30 jours :"
  },
  {
    id: "section_15",
    title: "15. Conclusion & Appel à l'Action",
    subtitle: "Le moment d'agir est maintenant !",
    content: `Nous voici arrivés au terme de ce premier chapitre, « Mindset Millionaire Zone – La Reprogrammation Mentale ». Si vous avez suivi ce parcours avec intention, vous ne tenez plus un simple livre, mais une véritable carte au trésor.

Mais la connaissance seule est impuissante sans l'action. Ce chapitre n'est pas une simple lecture passive, c'est un manuel de formation intensif, un appel immédiat à l'engagement envers vous-même.

Votre ancien mindset est confortable, prévisible, mais il représente également la limite absolue de votre potentiel de richesse. Le nouveau mindset que vous bâtissez est celui de l'abondance, de la liberté et de la maîtrise.`,
    deepDive: "Voici votre plan d'action immédiat pour les prochaines 24 heures : \n1. Relisez votre Déclaration d'Identité et votre objectif SMART.\n2. Pratiquez un exercice de transformation de votre choix pendant 7 jours.\n3. Identifiez une petite action concrète à réaliser dès aujourd'hui.\n4. Partagez votre engagement avec une personne de confiance.",
    exerciseType: "text",
    exerciseId: "final_action_commit",
    exerciseLabel: "Prenez un engagement ferme et solennel. Quelle action concrète réalisez-vous d'ici ce soir ?"
  }
];
*/

// Tasks for the 30-day program matching Section 14
const THIRTY_DAYS_TASKS = [
  { day: 1, title: "Gratitude & Intro", desc: "Lire l'introduction et écrire 3 gratitudes." },
  { day: 2, title: "Observer le Cycle", desc: "Observer le cycle Pensée-Émotion-Action une fois." },
  { day: 3, title: "Discipline 5min", desc: "Identifier un domaine et faire une action de 5 minutes." },
  { day: 4, title: "Débuter la Liste", desc: "Lancer la Liste des Croyances Limitantes (Col 1 & 2)." },
  { day: 5, title: "Croyances Clés", desc: "Continuer la liste et identifier 3 croyances limitantes majeures." },
  { day: 6, title: "Biais en Action", desc: "Détecter un biais cognitif actif dans votre journée." },
  { day: 7, title: "Bilan Semaine 1", desc: "Réviser vos notes de la semaine. Repos et intégration." },
  { day: 8, title: "Journal des Biais", desc: "Tenir le journal des biais cognitifs et schémas sur une semaine." },
  { day: 9, title: "Déclaration d'Identité", desc: "Écrire et lire à voix haute votre Déclaration d'Identité." },
  { day: 10, title: "Agir Comme Si", desc: "Agir comme si vous étiez déjà cette personne idéale pendant 1 heure." },
  { day: 11, title: "Dialogue Intérieur", desc: "Observer votre dialogue intérieur pendant 15 minutes." },
  { day: 12, title: "Réécriture de Script", desc: "Réécrire un script de dialogue interne pour une situation stressante." },
  { day: 13, title: "Reconnaître & Agir", desc: "Pratiquer 'Reconnaître, Observer, Agir' face à une hésitation." },
  { day: 14, title: "Système de Démarrage", desc: "Créer un rituel de démarrage pour une tâche procrastinée." },
  { day: 15, title: "Plan d'Action Habitude", desc: "Choisir une nouvelle habitude et remplir le plan d'action." },
  { day: 16, title: "Exécuter l'Habitude", desc: "Lancer la première itération ultra-facile de 2 minutes." },
  { day: 17, title: "Cartographie de Peur", desc: "Remplir la Cartographie de la Peur pour votre plus grande crainte." },
  { day: 18, title: "Affronter la Peur", desc: "Faire une micro-action pour désamorcer la peur identifiée." },
  { day: 19, title: "Analyse Post-Mortem", desc: "Analyser froidement une erreur récente pour en extraire 3 leçons." },
  { day: 20, title: "Appliquer la Leçon", desc: "Mettre en œuvre l'action corrective issue de l'analyse d'erreur." },
  { day: 21, title: "Audit Médias", desc: "Faire un audit complet de vos contenus consommés sur 24 heures." },
  { day: 22, title: "Optimiser l'Espace", desc: "Ranger votre bureau et y ajouter un élément visuel inspirant." },
  { day: 23, title: "Visualisation Guidée", desc: "Faire une séance de visualisation active de 10 minutes." },
  { day: 24, title: "Objectif SMART", desc: "Rédiger et afficher votre objectif SMART à 12 mois." },
  { day: 25, title: "Le Pourquoi Profond", desc: "Écrire votre 'Pourquoi' intime et le placer bien en vue." },
  { day: 26, title: "Suivi de Progrès", desc: "Mettre en place un tableau visuel de validation des étapes SMART." },
  { day: 27, title: "Cercle d'Influence", desc: "Lister vos tracas et éliminer 80% des choses hors de contrôle." },
  { day: 28, title: "Révision Générale", desc: "Relire l'ensemble du chapitre et consolider vos apprentissages." },
  { day: 29, title: "Plan d'Après 30 jours", desc: "Sélectionner 3 habitudes ou exercices à pérenniser à vie." },
  { day: 30, title: "Lettre au Futur Moi", desc: "Rédiger une lettre décrivant vos accomplissements futurs. Célébration !" }
];

const PromptBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-6 rounded-2xl border border-amber-500/20 bg-neutral-900/95 overflow-hidden shadow-xl">
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-950 border-b border-amber-500/10 text-xs text-neutral-400">
        <span className="font-mono flex items-center gap-2">
          <Sparkles size={12} className="text-amber-500 animate-pulse" /> PROMPT COPIABLE POUR CHATGPT
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black transition-all font-semibold active:scale-95"
        >
          {copied ? (
            <>
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>Copié !</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copier le prompt</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto max-h-[350px] text-xs font-mono text-neutral-300 leading-relaxed whitespace-pre-wrap selection:bg-amber-500/20">
        {code}
      </div>
    </div>
  );
};

const parseMarkdownToBlocks = (content: string): string[] => {
  const blocks: string[] = [];
  const lines = content.split("\n");
  let inCodeBlock = false;
  let currentBlock: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // Ending a code block
        currentBlock.push(line);
        blocks.push(currentBlock.join("\n"));
        currentBlock = [];
        inCodeBlock = false;
      } else {
        // Starting a code block
        if (currentBlock.length > 0) {
          blocks.push(currentBlock.join("\n"));
          currentBlock = [];
        }
        currentBlock.push(line);
        inCodeBlock = true;
      }
    } else {
      if (inCodeBlock) {
        currentBlock.push(line);
      } else {
        if (line.trim() === "") {
          if (currentBlock.length > 0) {
            blocks.push(currentBlock.join("\n"));
            currentBlock = [];
          }
        } else {
          currentBlock.push(line);
        }
      }
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join("\n"));
  }

  return blocks.filter(b => b.trim() !== "");
};

const renderBoldParts = (text: string, keyPrefix: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, pi) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-bold-${pi}`} className="text-amber-400 font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

const renderFormattedText = (text: string, keyPrefix: string) => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  let matchIndex = 0;

  while ((match = linkRegex.exec(text)) !== null) {
    const precedingText = text.substring(lastIndex, match.index);
    if (precedingText) {
      parts.push(...renderBoldParts(precedingText, `${keyPrefix}-pre-${matchIndex}`));
    }
    const linkText = match[1];
    const linkUrl = match[2];
    parts.push(
      <a
        key={`${keyPrefix}-link-${matchIndex}`}
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-amber-400 font-semibold underline hover:text-amber-300 transition-colors inline-flex items-center gap-1"
      >
        {linkText}
      </a>
    );
    lastIndex = linkRegex.lastIndex;
    matchIndex++;
  }

  const remainingText = text.substring(lastIndex);
  if (remainingText) {
    parts.push(...renderBoldParts(remainingText, `${keyPrefix}-post`));
  }

  return parts;
};

const renderParagraphContent = (para: string, index: number) => {
  const trimmed = para.trim();
  if (!trimmed) return null;

  // Google Drive Video Embed
  if (trimmed.startsWith("[gdrive-video]")) {
    const url = trimmed.replace("[gdrive-video]", "").trim();
    // Convert view URL to preview URL
    const embedUrl = url.replace("/view?usp=sharing", "/preview").replace("/view", "/preview");
    return (
      <div key={index} className="my-6 rounded-3xl overflow-hidden border border-amber-500/30 bg-black aspect-video relative shadow-2xl">
        <iframe
          className="absolute inset-0 w-full h-full"
          src={embedUrl}
          title="Google Drive Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
        ></iframe>
      </div>
    );
  }

  // Code block parser (e.g. prompt block)
  if (trimmed.startsWith("```")) {
    const lines = trimmed.split("\n");
    const codeLines = lines.slice(1, lines[lines.length - 1].startsWith("```") ? -1 : undefined);
    const codeText = codeLines.join("\n");
    return <PromptBlock key={index} code={codeText} />;
  }

  // Headings
  if (trimmed.startsWith("## ")) {
    return (
      <h2 key={index} className="text-xl font-bold text-amber-400 mt-8 mb-3 border-b border-amber-500/10 pb-1">
        {renderFormattedText(trimmed.substring(3), `${index}-h2`)}
      </h2>
    );
  }
  if (trimmed.startsWith("### ")) {
    return (
      <h3 key={index} className="text-lg font-semibold text-neutral-200 mt-6 mb-2">
        {renderFormattedText(trimmed.substring(4), `${index}-h3`)}
      </h3>
    );
  }

  // Blockquote
  if (trimmed.startsWith("> ")) {
    const quoteText = trimmed.substring(2).replace(/^\*\*/, "").replace(/\*\*$/, "");
    return (
      <blockquote key={index} className="border-l-4 border-amber-500/40 pl-4 py-2 italic bg-amber-500/5 text-neutral-300 rounded-r-lg my-4 leading-relaxed">
        {renderFormattedText(quoteText, `${index}-quote`)}
      </blockquote>
    );
  }

  // Bullet points / Lists
  if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
    const listLines = trimmed.split("\n");
    return (
      <ul key={index} className="list-disc pl-5 space-y-2 text-neutral-300 my-4">
        {listLines.map((line, li) => {
          const content = line.replace(/^[*•-]\s+/, "");
          // Inline bold parser for list item
          const boldMatch = content.match(/^\*\*(.*?)\*\*:(.*)/) || content.match(/^\*\*(.*?)\*\*(.*)/);
          if (boldMatch) {
            return (
              <li key={li} className="leading-relaxed">
                <strong className="text-amber-400 font-semibold">{boldMatch[1]}</strong>
                {renderFormattedText(boldMatch[2], `${index}-li-${li}`)}
              </li>
            );
          }
          return (
            <li key={li} className="leading-relaxed">
              {renderFormattedText(content, `${index}-li-raw-${li}`)}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <p key={index} className="leading-relaxed text-sm md:text-base text-neutral-300">
      {renderFormattedText(trimmed, `${index}-p`)}
    </p>
  );
};

export const FormationTab: React.FC<FormationTabProps> = ({ profile, onSwitchTab }) => {
  const [activeModule, setActiveModule] = useState<"mindset" | "first_million">("mindset");
  const [viewMode, setViewMode] = useState<"modules" | "reader">("modules");
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  
  // Audio Simulator State
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(24);
  const [isMuted, setIsMuted] = useState(false);

  // Custom Interactive Exercise States
  const [beliefs, setBeliefs] = useState<Array<{ id: string; domain: string; belief: string; proof: string }>>([
    { id: "1", domain: "Argent", belief: "L'argent est difficile à gagner et s'en va trop vite", proof: "Mes parents le répétaient tout le temps" }
  ]);
  const [newBelief, setNewBelief] = useState({ domain: "", belief: "", proof: "" });

  const [habitBlueprint, setHabitBlueprint] = useState({
    habit: "Lire des biographies d'entrepreneurs",
    trigger: "Juste après avoir bu mon café du matin",
    craving: "Anticiper le calme, l'inspiration et les nouvelles idées",
    easyStart: "Ouvrir le livre et lire au moins 2 pages",
    reward: "Savourer un carré de chocolat noir ou cocher ma case"
  });

  const [fearMap, setFearMap] = useState({
    fear: "Lancer ma boutique en ligne",
    worst: "Que personne n'achète et que mes proches se moquent de moi",
    best: "Faire mes premières ventes, gagner en confiance et générer des commissions",
    probable: "Faire quelques ventes lentes au début, apprendre les techniques, et m'améliorer",
    minimalAction: "Choisir un premier produit et l'importer dans ma boutique d'affiliation"
  });

  const [smartGoal, setSmartGoal] = useState({
    s: "Augmenter mon revenu mensuel net de 300 000 FCFA",
    m: "En vendant 15 formations d'élite par mois grâce à mes tunnels d'affiliation",
    a: "Totalement réaliste grâce aux stratégies automatiques de parrainage et de boutique MZ+",
    r: "Parfaitement aligné avec mon projet de liberté financière et de démission professionnelle",
    t: "D'ici le 31 Décembre"
  });

  // Sync Answers with localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`mz_answers_${profile?.id || "guest"}`);
    if (saved) {
      try { setUserAnswers(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
    const savedCompleted = localStorage.getItem(`mz_completed_sections_${profile?.id || "guest"}`);
    if (savedCompleted) {
      try { setCompletedSections(JSON.parse(savedCompleted)); } catch (e) { console.error(e); }
    }
    const savedDays = localStorage.getItem(`mz_completed_days_30_${profile?.id || "guest"}`);
    if (savedDays) {
      try { setCompletedDays(JSON.parse(savedDays)); } catch (e) { console.error(e); }
    }
  }, [profile?.id]);

  // Simulated wave animation effect
  useEffect(() => {
    let interval: any;
    if (isAudioPlaying) {
      interval = setInterval(() => {
        setAudioProgress(prev => {
          if (prev >= 100) {
            setIsAudioPlaying(false);
            return 0;
          }
          return prev + 0.5;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAudioPlaying]);

  const saveAnswers = (newAnswers: Record<string, string>) => {
    setUserAnswers(newAnswers);
    localStorage.setItem(`mz_answers_${profile?.id || "guest"}`, JSON.stringify(newAnswers));
  };

  const handleTextAnswerChange = (id: string, text: string) => {
    saveAnswers({ ...userAnswers, [id]: text });
  };

  // Mark active section as complete
  const markSectionComplete = () => {
    const currentSections = activeModule === "mindset" ? MODULE_SECTIONS : FIRST_MILLION_SECTIONS;
    const currentSectionId = currentSections[activeSectionIdx]?.id || "";
    if (currentSectionId && !completedSections.includes(currentSectionId)) {
      const updated = [...completedSections, currentSectionId];
      setCompletedSections(updated);
      localStorage.setItem(`mz_completed_sections_${profile?.id || "guest"}`, JSON.stringify(updated));
      
      // Award XP
      triggerCompletionCelebration();
    }
  };

  // Toggle day completion in 30-day program
  const toggleDayComplete = (day: number) => {
    let updated: number[];
    if (completedDays.includes(day)) {
      updated = completedDays.filter(d => d !== day);
    } else {
      updated = [...completedDays, day].sort((a, b) => a - b);
      triggerCelebrationSparkles();
    }
    setCompletedDays(updated);
    localStorage.setItem(`mz_completed_days_30_${profile?.id || "guest"}`, JSON.stringify(updated));
  };

  const triggerCompletionCelebration = () => {
    // Elegant fireworks celebration using canvas-confetti
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ["#C9A84C", "#FFF2D4", "#8C712B", "#FFFFFF"]
    });

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ["#C9A84C", "#FFF2D4"]
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ["#C9A84C", "#FFF2D4"]
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Trigger local XP event to boost dynamic UI
    window.dispatchEvent(new CustomEvent("mz-xp-gained", { detail: { amount: 50, source: "formation_complete" } }));
  };

  const triggerCelebrationSparkles = () => {
    confetti({
      particleCount: 30,
      spread: 40,
      origin: { y: 0.8 },
      colors: ["#C9A84C", "#8C712B"]
    });
    window.dispatchEvent(new CustomEvent("mz-xp-gained", { detail: { amount: 15, source: "daily_challenge" } }));
  };

  // Beliefs interactive methods
  const addBelief = () => {
    if (!newBelief.domain || !newBelief.belief) return;
    const item = {
      id: Date.now().toString(),
      ...newBelief
    };
    const updated = [...beliefs, item];
    setBeliefs(updated);
    setNewBelief({ domain: "", belief: "", proof: "" });
    triggerCelebrationSparkles();
  };

  const deleteBelief = (id: string) => {
    setBeliefs(beliefs.filter(b => b.id !== id));
  };

  const currentSections = activeModule === "mindset" ? MODULE_SECTIONS : FIRST_MILLION_SECTIONS;
  const activeSection = currentSections[activeSectionIdx] || currentSections[0];
  const overallProgress = Math.round(
    ((completedSections.filter(id => MODULE_SECTIONS.some(sec => sec.id === id)).length / MODULE_SECTIONS.length) * 100)
  );
  const firstMillionProgress = Math.round(
    ((completedSections.filter(id => FIRST_MILLION_SECTIONS.some(sec => sec.id === id)).length / FIRST_MILLION_SECTIONS.length) * 100)
  );
  const globalProgress = Math.round(
    ((completedSections.filter(id => [...MODULE_SECTIONS, ...FIRST_MILLION_SECTIONS].some(sec => sec.id === id)).length / (MODULE_SECTIONS.length + FIRST_MILLION_SECTIONS.length)) * 100)
  );

  if (viewMode === "modules") {
    return (
      <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-4 animate-fade-in pb-20 text-neutral-200">
        
        {/* LUXURIOUS MINIMAL HEADER (Super elegant and space efficient so no scroll is needed) */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#0F0D0A] via-[#1B1812] to-[#0A0907] p-5 border border-[#C9A84C]/20 overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,168,76,0.06),transparent_60%)] pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-full">
                <Sparkles size={10} className="text-[#C9A84C] animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-wider text-[#C9A84C]">ACADÉMIE MINDSET ÉLITE</span>
              </div>
              <h1 className="text-xl md:text-3xl font-display font-black text-white uppercase tracking-tight">
                Espace <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFF2D4] via-[#C9A84C] to-[#8C712B] drop-shadow-[0_4px_10px_rgba(201,168,76,0.25)]">Formation</span>
              </h1>
            </div>

            {/* Micro Global Progress Stat */}
            <div className="flex items-center gap-3 bg-black/40 border border-white/5 px-3 py-2 rounded-xl">
              <div className="text-right">
                <span className="block text-[7px] text-neutral-500 font-mono uppercase tracking-wider">PROGRESSION GLOBALE</span>
                <span className="text-xs font-black text-[#C9A84C]">{globalProgress}%</span>
              </div>
              <div className="w-16 h-1 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#C9A84C] to-[#FFF2D4]" style={{ width: `${globalProgress}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* ULTRA-PRESTIGIOUS CIRCULAR MEDALLIONS (Highly visible module titles and chapter counts below the circles) */}
        <div className="flex flex-row flex-nowrap items-start justify-center gap-4 sm:gap-16 py-8 max-w-full overflow-visible">
          
          {/* Card Module 1: Mindset */}
          <div
            onClick={() => {
              setActiveModule("mindset");
              setActiveSectionIdx(0);
              setViewMode("reader");
              triggerCelebrationSparkles();
            }}
            className="flex flex-col items-center text-center group cursor-pointer max-w-[150px] xs:max-w-[175px] sm:max-w-[280px] md:max-w-[330px] space-y-4"
          >
            {/* The circular medallion */}
            <div
              className="relative w-[120px] h-[120px] xs:w-[140px] xs:h-[140px] sm:w-[220px] sm:h-[220px] md:w-[280px] md:h-[280px] rounded-full bg-gradient-to-b from-[#2E1065] via-[#0F051D] to-[#020105] border-2 border-purple-500/30 group-hover:border-purple-400/80 transition-all duration-500 group-hover:scale-[1.05] group-hover:shadow-[0_0_50px_rgba(168,85,247,0.4)] overflow-hidden shadow-[0_15px_45px_rgba(0,0,0,0.8)] flex items-center justify-center"
              id="medallion-mindset"
            >
              {/* Ambient Animated Purple Aura */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#D946EF]/10 via-transparent to-[#8B5CF6]/10 opacity-40 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              
              {/* Rotating Luxury Dotted Halo */}
              <div className="absolute inset-1.5 sm:inset-3 rounded-full border border-dashed border-purple-500/20 animate-[spin_100s_linear_infinite] pointer-events-none"></div>
              
              {/* Concentric Thin Ring */}
              <div className="absolute inset-3.5 sm:inset-6 rounded-full border border-purple-500/10 pointer-events-none"></div>

              {/* Glowing SVG Progress Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="ring-gradient-mindset" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#EC4899" />
                    <stop offset="50%" stopColor="#D946EF" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="stroke-white/[0.04] fill-none"
                  strokeWidth="2.5"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="fill-none transition-all duration-1000 ease-out"
                  stroke="url(#ring-gradient-mindset)"
                  strokeWidth="3"
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={2 * Math.PI * 45 - (overallProgress / 100) * 2 * Math.PI * 45}
                  strokeLinecap="round"
                />
              </svg>

              {/* Clean inner circle content: Large Icon + Big percentage progress */}
              <div className="absolute inset-2 sm:inset-5 rounded-full bg-[#040108]/95 flex flex-col justify-center items-center p-3 z-10 border border-purple-500/20 shadow-inner">
                {/* Module Large Icon */}
                <div className="w-10 h-10 sm:w-20 sm:h-20 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                  <GraduationCap className="w-5 h-5 sm:w-10 sm:h-10 text-purple-300" />
                </div>
                {/* Big percentage indicator */}
                <div className="mt-1 sm:mt-3 text-center">
                  <span className="block text-[11px] sm:text-2xl font-black text-white font-mono leading-none">
                    {overallProgress}%
                  </span>
                  <span className="hidden sm:block text-[8px] font-mono font-bold tracking-widest text-purple-400/70 uppercase mt-1">
                    COMPLÉTÉ
                  </span>
                </div>
              </div>
            </div>

            {/* Labels and title under the circle */}
            <div className="space-y-1.5 sm:space-y-4 mt-3 w-full">
              {/* Module Tag & Chapter count */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3">
                <span className="text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-mono font-black text-purple-300 uppercase tracking-wider bg-purple-500/20 px-2.5 py-1 rounded-full border border-purple-500/35 shadow-md">
                  MODULE 01
                </span>
                <span className="text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-mono font-black text-neutral-200 bg-neutral-800/90 px-2.5 py-1 rounded-full border border-neutral-700/80 shadow-md">
                  {MODULE_SECTIONS.length} Chapitres
                </span>
              </div>

              {/* Highly Visible and Bold Title */}
              <h3 className="text-[12px] xs:text-[14px] sm:text-xl md:text-2xl lg:text-3xl font-display font-black text-white group-hover:text-purple-300 transition-colors duration-300 uppercase tracking-tight leading-tight sm:leading-snug drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] px-1">
                Devenir la personne capable de générer le million
              </h3>

              {/* Action Prompt */}
              <div className="inline-flex items-center justify-center gap-1.5 text-[9px] sm:text-xs font-mono font-black text-purple-400 uppercase tracking-widest group-hover:text-white transition-all duration-300">
                <span>ENTRER DANS LE MODULE</span>
                <ArrowRight className="w-2.5 h-2.5 sm:w-4 sm:h-4 group-hover:translate-x-1.5 transition-transform text-purple-400" />
              </div>
            </div>
          </div>

          {/* Card Module 2: Comment Gagner Mon Premier Million */}
          <div
            onClick={() => {
              setActiveModule("first_million");
              setActiveSectionIdx(0);
              setViewMode("reader");
              triggerCelebrationSparkles();
            }}
            className="flex flex-col items-center text-center group cursor-pointer max-w-[150px] xs:max-w-[175px] sm:max-w-[280px] md:max-w-[330px] space-y-4"
          >
            {/* The circular medallion */}
            <div
              className="relative w-[120px] h-[120px] xs:w-[140px] xs:h-[140px] sm:w-[220px] sm:h-[220px] md:w-[280px] md:h-[280px] rounded-full bg-gradient-to-b from-[#0D241C] via-[#05110E] to-[#010605] border-2 border-emerald-500/30 group-hover:border-emerald-400/80 transition-all duration-500 group-hover:scale-[1.05] group-hover:shadow-[0_0_50px_rgba(16,185,129,0.4)] overflow-hidden shadow-[0_15px_45px_rgba(0,0,0,0.8)] flex items-center justify-center"
              id="medallion-firstmillion"
            >
              {/* Ambient Animated Emerald/Cyan Aura */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#10B981]/10 via-transparent to-[#06B6D4]/10 opacity-40 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              
              {/* Rotating Luxury Dotted Halo */}
              <div className="absolute inset-1.5 sm:inset-3 rounded-full border border-dashed border-emerald-500/20 animate-[spin_100s_linear_infinite] pointer-events-none"></div>
              
              {/* Concentric Thin Ring */}
              <div className="absolute inset-3.5 sm:inset-6 rounded-full border border-emerald-500/10 pointer-events-none"></div>

              {/* Glowing SVG Progress Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="ring-gradient-firstmillion" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="50%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="stroke-white/[0.04] fill-none"
                  strokeWidth="2.5"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="fill-none transition-all duration-1000 ease-out"
                  stroke="url(#ring-gradient-firstmillion)"
                  strokeWidth="3"
                  strokeDasharray={2 * Math.PI * 45}
                  strokeDashoffset={2 * Math.PI * 45 - (firstMillionProgress / 100) * 2 * Math.PI * 45}
                  strokeLinecap="round"
                />
              </svg>

              {/* Clean inner circle content: Large Icon + Big percentage progress */}
              <div className="absolute inset-2 sm:inset-5 rounded-full bg-[#010403]/95 flex flex-col justify-center items-center p-3 z-10 border border-emerald-500/20 shadow-inner">
                {/* Module Large Icon */}
                <div className="w-10 h-10 sm:w-20 sm:h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <Trophy className="w-5 h-5 sm:w-10 sm:h-10 text-emerald-300" />
                </div>
                {/* Big percentage indicator */}
                <div className="mt-1 sm:mt-3 text-center">
                  <span className="block text-[11px] sm:text-2xl font-black text-white font-mono leading-none">
                    {firstMillionProgress}%
                  </span>
                  <span className="hidden sm:block text-[8px] font-mono font-bold tracking-widest text-emerald-400/70 uppercase mt-1">
                    COMPLÉTÉ
                  </span>
                </div>
              </div>
            </div>

            {/* Labels and title under the circle */}
            <div className="space-y-1.5 sm:space-y-4 mt-3 w-full">
              {/* Module Tag & Chapter count */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3">
                <span className="text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-mono font-black text-emerald-300 uppercase tracking-wider bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/35 shadow-md">
                  MODULE 02
                </span>
                <span className="text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-mono font-black text-neutral-200 bg-neutral-800/90 px-2.5 py-1 rounded-full border border-neutral-700/80 shadow-md">
                  {FIRST_MILLION_SECTIONS.length} Chapitres
                </span>
              </div>

              {/* Highly Visible and Bold Title */}
              <h3 className="text-[12px] xs:text-[14px] sm:text-xl md:text-2xl lg:text-3xl font-display font-black text-white group-hover:text-emerald-300 transition-colors duration-300 uppercase tracking-tight leading-tight sm:leading-snug drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] px-1">
                Comment générer mon premier million avec MZ+
              </h3>

              {/* Action Prompt */}
              <div className="inline-flex items-center justify-center gap-1.5 text-[9px] sm:text-xs font-mono font-black text-emerald-400 uppercase tracking-widest group-hover:text-white transition-all duration-300">
                <span>ENTRER DANS LE MODULE</span>
                <ArrowRight className="w-2.5 h-2.5 sm:w-4 sm:h-4 group-hover:translate-x-1.5 transition-transform text-emerald-400" />
              </div>
            </div>
          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in pb-24 text-neutral-200">
      
      {/* LUXURIOUS HEADER BANNER */}
      <div className="relative rounded-[2.5rem] bg-gradient-to-br from-[#0F0D0A] via-[#1B1812] to-[#0A0907] p-8 border border-[var(--color-gold-main)]/30 overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,168,76,0.1),transparent_60%)] pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-full">
              <GraduationCap size={12} className="text-[#C9A84C]" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C9A84C]">ACADÉMIE MINDSET ÉLITE</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-tighter italic leading-none">
              {activeModule === "mindset" ? (
                <>DEVENIR LA PERSONNE <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFF2D4] via-[#C9A84C] to-[#8C712B] drop-shadow-[0_4px_12px_rgba(201,168,76,0.3)]">CAPABLE DE GÉNÉRER LE MILLION</span></>
              ) : (
                <>COMMENT GÉNÉRER SON <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFF2D4] via-[#C9A84C] to-[#8C712B] drop-shadow-[0_4px_12px_rgba(201,168,76,0.3)]">PREMIER MILLION AVEC MZ+</span></>
              )}
            </h1>
            <p className="text-neutral-400 text-xs md:text-sm max-w-2xl font-medium tracking-wide">
              {activeModule === "mindset"
                ? "La reprogrammation mentale intégrale pour briser vos croyances limitantes, maîtriser votre discipline et attirer naturellement l’abondance financière."
                : "Le plan d'action d'élite pour concevoir votre offre, cibler un public qualifié et scaler vos gains en ligne grâce aux tunnels de recommandation haut rendement."}
            </p>
          </div>

          {/* PROGRESS RADIAL DISPLAY */}
          <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md p-4 rounded-3xl border border-white/5 shadow-inner">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  className="stroke-neutral-800"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  className="stroke-[#C9A84C] transition-all duration-1000"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={2 * Math.PI * 28 * (1 - overallProgress / 100)}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xs font-black text-white">{overallProgress}%</span>
              </div>
            </div>
            <div className="text-left space-y-0.5">
              <span className="text-[8px] font-black uppercase text-[#C9A84C] tracking-widest flex items-center gap-1">
                <Trophy size={8} /> Progression
              </span>
              <p className="text-[10px] text-white font-bold uppercase">{completedSections.length} / {MODULE_SECTIONS.length} Sections</p>
              <p className="text-[8px] text-neutral-500 uppercase tracking-tighter">Chapitre 1 : Actif</p>
            </div>
          </div>
        </div>
      </div>

      {/* BACK TO PORTAL BUTTON / BREADCRUMB */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <button
          onClick={() => setViewMode("modules")}
          className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-[#C9A84C]/10 hover:border-[#C9A84C]/30 text-xs font-bold text-neutral-300 hover:text-white transition-all"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Retour aux modules</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="text-neutral-500 uppercase">Module Actif :</span>
          <span className="text-[#C9A84C] uppercase px-3 py-1 bg-[#C9A84C]/10 rounded-lg border border-[#C9A84C]/20 font-display text-xs">
            {activeModule === "mindset" ? "1 • Devenir la personne capable de générer le million" : "2 • Comment générer mon premier million avec MZ+"}
          </span>
        </div>
      </div>

      <>
          {/* AUDIO READER CONTROLS (HIGH FIDELITY SIMULATOR) */}
      <div className="rounded-2xl bg-neutral-950 p-4 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAudioPlaying(!isAudioPlaying)}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-[#FFF2D4] to-[#C9A84C] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg"
          >
            {isAudioPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} className="ml-0.5" fill="currentColor" />}
          </button>
          <div className="text-left">
            <span className="text-[8px] font-black uppercase text-[#C9A84C] tracking-widest block">Lecteur Masterclass</span>
            <span className="text-xs font-black text-white block truncate max-w-[200px] sm:max-w-none">
              {activeSection.title} : {activeSection.subtitle}
            </span>
          </div>
        </div>

        {/* Waves Animation */}
        <div className="flex items-center gap-1 h-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(bar => (
            <div
              key={bar}
              className="w-0.5 bg-[#C9A84C]/80 rounded-full transition-all duration-300"
              style={{
                height: isAudioPlaying ? `${Math.floor(Math.random() * 20) + 4}px` : "4px"
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none flex items-center gap-2 text-xs font-mono text-neutral-500">
            <span>{Math.floor((audioProgress * 4.2) / 60)}:{(Math.floor((audioProgress * 4.2) % 60)).toString().padStart(2, "0")}</span>
            <div className="w-24 md:w-32 h-1 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#C9A84C]" style={{ width: `${audioProgress}%` }}></div>
            </div>
            <span>4:12</span>
          </div>

          <button onClick={() => setIsMuted(!isMuted)} className="text-neutral-400 hover:text-white">
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>

      {/* MOBILE SYLLABUS SELECTOR */}
      <div className="lg:hidden w-full bg-neutral-950 border border-white/5 rounded-3xl p-5 space-y-2 mb-2 text-left shadow-lg">
        <label className="text-[8px] font-black uppercase text-[#C9A84C] tracking-[0.2em] block">
          Chapitre En Cours :
        </label>
        <div className="relative">
          <select
            value={activeSectionIdx}
            onChange={(e) => setActiveSectionIdx(Number(e.target.value))}
            className="w-full bg-black text-white text-xs font-bold rounded-2xl border border-white/10 p-4 appearance-none focus:border-[#C9A84C]/50 focus:outline-none cursor-pointer"
          >
            {currentSections.map((sec, idx) => (
              <option key={sec.id} value={idx}>
                {idx + 1}. {sec.title} — {sec.subtitle}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-neutral-400">
            <ChevronRight size={14} className="rotate-90 text-[#C9A84C]" />
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID: Left Menu Navigation & Right Interactive Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: MODULE NAVIGATION PANEL */}
        <div className="lg:col-span-4 space-y-4 hidden lg:block">
          <div className="bg-neutral-900 border border-white/5 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-[10px] font-black uppercase text-[#C9A84C] tracking-widest">
                SOMMAIRE DU CHAPITRE
              </span>
              <span className="text-[8px] font-bold text-neutral-500 uppercase">
                {currentSections.length} chapitres
              </span>
            </div>

            {/* List of sections */}
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {currentSections.map((sec, idx) => {
                const isCurrent = idx === activeSectionIdx;
                const isCompleted = completedSections.includes(sec.id);
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSectionIdx(idx)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                      isCurrent
                        ? "bg-gradient-to-r from-[#1A1814] to-[#0A0908] border-[#C9A84C]/50 text-white shadow-md shadow-[#C9A84C]/5"
                        : "bg-transparent border-transparent text-neutral-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isCurrent ? "bg-[#C9A84C] text-black" : "bg-neutral-800 text-neutral-500"
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isCurrent ? "text-white" : "text-neutral-300"}`}>
                          {sec.title}
                        </p>
                        <p className="text-[9px] text-neutral-500 truncate mt-0.5">
                          {sec.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isCompleted ? (
                        <CheckCircle2 size={14} className="text-emerald-500 fill-emerald-950/40" />
                      ) : (
                        <ChevronRight size={14} className="text-neutral-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prestige mini card */}
          <div className="bg-gradient-to-b from-[#1C1A14] to-[#0A0908] rounded-3xl p-5 border border-[#C9A84C]/20 shadow-md text-center space-y-3">
            <span className="inline-block p-2 bg-[#C9A84C]/10 rounded-full text-[#C9A84C] animate-pulse">
              <Award size={20} />
            </span>
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase text-white tracking-widest">Mastery Level-Up</h4>
              <p className="text-[10px] text-neutral-400">Complétez l'ensemble du chapitre pour débloquer le badge prestige d'Identité Millionnaire et obtenir 250 XP bonus !</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: HIGH CONTRAST INTERACTIVE READER PANEL */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-neutral-900/60 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-6 md:p-10 shadow-2xl space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/0 via-[#C9A84C]/20 to-amber-500/0"></div>

            {/* Header Content Info */}
            <div className="space-y-3 border-b border-white/5 pb-6">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase text-[#C9A84C] tracking-[0.25em]">
                  {activeSection.title}
                </span>
                <span className="text-[8px] font-mono text-neutral-500 uppercase flex items-center gap-1">
                  <Clock size={10} /> Temps de lecture : ~4 min
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight uppercase leading-none">
                {activeSection.subtitle}
              </h2>
            </div>

            {/* Book Body text */}
            <div className="space-y-6 text-neutral-300 text-sm md:text-base leading-relaxed font-sans font-normal antialiased">
              {activeSection.id === "intro" && (
                <div className="space-y-6 mb-10 border-b border-white/5 pb-10">
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-2">
                    NOTE IMPORTANTE — À LIRE AVANT DE COMMENCER LE MODULE MINDSET
                  </h3>
                  
                  <p>
                    Avant que tu commences ce module, il y a une chose que tu dois comprendre clairement.
                  </p>
                  
                  <p>
                    La majorité des personnes qui rejoignent un programme comme celui-ci font la même erreur.
                  </p>
                  
                  <p className="font-bold text-white">
                    👉 Elles sautent le module mindset.
                  </p>
                  
                  <p>
                    Elles pensent que ce n’est pas important.
                    Elles veulent aller directement aux stratégies, aux méthodes, aux résultats rapides.
                  </p>
                  
                  <p className="font-bold text-white">
                    Mais c’est exactement là que la différence se crée entre ceux qui progressent… et ceux qui abandonnent.
                  </p>

                  <h4 className="text-sm font-black text-white uppercase tracking-wider pt-4">
                    Pourquoi ce module est le plus important
                  </h4>

                  <p>
                    Imagine une application sur ton téléphone.
                  </p>
                  
                  <p>
                    Si elle n’est pas programmée pour envoyer des messages, peu importe combien tu appuies sur les boutons…
                    <span className="font-bold text-white"> 👉 elle ne le fera jamais.</span>
                  </p>
                  
                  <p>
                    Ce n’est pas un problème d’effort.
                    C’est un problème de programmation.
                  </p>
                  
                  <p>
                    C’est exactement la même chose avec un être humain.
                  </p>
                  
                  <p>
                    Si ton esprit est programmé pour douter, abandonner ou rester bloqué :
                    <span className="font-bold text-white"> 👉 même avec les meilleures opportunités, tu vas te limiter toi-même.</span>
                  </p>
                  
                  <p>
                    Mais si ton esprit est programmé pour chercher des solutions, persévérer et apprendre :
                    <span className="font-bold text-white"> 👉 tu vas naturellement te rapprocher de la réussite.</span>
                  </p>

                  <h4 className="text-sm font-black text-white uppercase tracking-wider pt-4">
                    Le vrai danger
                  </h4>

                  <p>
                    Ne pas comprendre ça, c’est comme vouloir construire une maison sans fondation.
                  </p>
                  
                  <p>
                    Tout peut sembler fonctionner au début…
                    mais tôt ou tard, tout s’écroule.
                  </p>

                  <h4 className="text-sm font-black text-white uppercase tracking-wider pt-4">
                    Ce que tu dois faire maintenant
                  </h4>

                  <p>
                    Ne traite pas ce module comme une simple introduction.
                  </p>
                  
                  <p>
                    Traite-le comme la base de tout le reste.
                  </p>
                  
                  <p className="font-bold text-white">
                    Parce que si ton mindset ne change pas :
                    👉 rien d’autre ne changera durablement.
                  </p>
                </div>
              )}
            </div>

            {/* Book Body text */}
            <div className="space-y-6 text-neutral-300 text-sm md:text-base leading-relaxed font-sans font-normal antialiased">
              {parseMarkdownToBlocks(activeSection.content).map((para, i) => renderParagraphContent(para, i))}
            </div>

            {/* Embedded YouTube video if exists */}
            {activeSection.youtubeId && (
              <div className="my-6 rounded-3xl overflow-hidden border border-amber-500/30 bg-black aspect-video relative shadow-2xl">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${activeSection.youtubeId}?autoplay=0&rel=0`}
                  title={activeSection.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                ></iframe>
              </div>
            )}

            {/* EXPLANATION / DEEP DIVE ACCORDION CARDS (IF EXISTS) */}
            {activeSection.deepDive && (
              <div className="p-5 rounded-2xl bg-neutral-950 border-l-4 border-amber-500 text-xs text-neutral-400 space-y-2">
                <div className="flex items-center gap-2 text-amber-500 font-bold uppercase tracking-wider">
                  <Star size={12} fill="currentColor" /> EXPLICATION APPROFONDIE
                </div>
                <p className="leading-relaxed whitespace-pre-line">{activeSection.deepDive}</p>
              </div>
            )}

            {activeSection.analogy && (
              <div className="p-5 rounded-2xl bg-neutral-950 border-l-4 border-blue-500 text-xs text-neutral-400 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider">
                  <Volume2 size={12} /> ANALOGIE MÉMORABLE
                </div>
                <p className="italic leading-relaxed">« {activeSection.analogy} »</p>
              </div>
            )}

            {activeSection.example && (
              <div className="p-5 rounded-2xl bg-neutral-950 border-l-4 border-emerald-500 text-xs text-neutral-400 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider">
                  <Target size={12} /> EXEMPLE RÉALISTE
                </div>
                <p className="leading-relaxed">{activeSection.example}</p>
              </div>
            )}

            {/* INTERACTIVE QUESTIONS & EXERCISES */}
            <div className="pt-6 border-t border-white/5 space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-[#C9A84C] tracking-widest flex items-center gap-1.5">
                  <Sparkles size={12} /> WORKBOOK / ATELIER PRATIQUE
                </span>
                <p className="text-xs text-neutral-400">
                  {activeSection.introspection || "Remplissez cet exercice pour ancrer durablement la reprogrammation dans votre subconscient."}
                </p>
              </div>

              {/* Dynamic rendering of specific exercise type */}
              
              {/* Type: TEXT */}
              {activeSection.exerciseType === "text" && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-white block">
                    {activeSection.exerciseLabel}
                  </label>
                  <textarea
                    rows={4}
                    value={userAnswers[activeSection.exerciseId] || ""}
                    onChange={(e) => handleTextAnswerChange(activeSection.exerciseId, e.target.value)}
                    placeholder="Écrivez votre introspection ici. Vos réponses sont sauvegardées automatiquement..."
                    className="w-full p-4 rounded-2xl bg-black border border-white/10 focus:border-[#C9A84C]/50 text-neutral-200 text-xs focus:outline-none transition-colors"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        triggerCelebrationSparkles();
                        alert("Réponse enregistrée avec succès ! +15 XP accordés.");
                      }}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                    >
                      <Save size={12} /> Enregistrer
                    </button>
                  </div>
                </div>
              )}

              {/* Type: BELIEFS TRACKER */}
              {activeSection.exerciseType === "beliefs_list" && (
                <div className="space-y-5">
                  <label className="text-xs font-bold text-white block">
                    {activeSection.exerciseLabel}
                  </label>

                  {/* List of existing beliefs */}
                  <div className="space-y-2">
                    {beliefs.map(b => (
                      <div key={b.id} className="p-4 rounded-xl bg-black border border-white/5 flex justify-between items-start gap-4">
                        <div className="space-y-1 text-left">
                          <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[8px] font-bold text-neutral-400 uppercase">
                            {b.domain}
                          </span>
                          <p className="text-xs font-bold text-white">Croyance : « {b.belief} »</p>
                          {b.proof && (
                            <p className="text-[10px] text-neutral-500 italic">Preuves perçues : {b.proof}</p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteBelief(b.id)}
                          className="p-1.5 text-neutral-600 hover:text-red-500 rounded transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add form */}
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-white/5 space-y-3">
                    <p className="text-[10px] font-black uppercase text-neutral-400">Ajouter une croyance limitante</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Domaine (ex: Argent, Relations)"
                        value={newBelief.domain}
                        onChange={(e) => setNewBelief({ ...newBelief, domain: e.target.value })}
                        className="p-2.5 rounded-lg bg-black border border-white/10 text-[11px] text-white focus:outline-none focus:border-[#C9A84C]/50"
                      />
                      <input
                        type="text"
                        placeholder="Croyance limitante"
                        value={newBelief.belief}
                        onChange={(e) => setNewBelief({ ...newBelief, belief: e.target.value })}
                        className="p-2.5 rounded-lg bg-black border border-white/10 text-[11px] text-white focus:outline-none focus:border-[#C9A84C]/50 md:col-span-2"
                      />
                    </div>
                    <textarea
                      placeholder="Preuves imaginaires (ex: 'Mes parents me disaient toujours ça')"
                      value={newBelief.proof}
                      onChange={(e) => setNewBelief({ ...newBelief, proof: e.target.value })}
                      rows={2}
                      className="w-full p-2.5 rounded-lg bg-black border border-white/10 text-[11px] text-white focus:outline-none focus:border-[#C9A84C]/50"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={addBelief}
                        className="px-4 py-2 rounded-xl bg-[#C9A84C] text-black text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:scale-102 transition-transform"
                      >
                        <Plus size={12} /> Insérer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Type: IDENTITY STATEMENT */}
              {activeSection.exerciseType === "identity_declaration" && (
                <div className="space-y-4">
                  <label className="text-xs font-bold text-white block">
                    {activeSection.exerciseLabel}
                  </label>
                  <div className="p-4 rounded-xl bg-black/40 border border-[#C9A84C]/10 italic text-neutral-400 text-xs leading-relaxed space-y-2">
                    <p className="font-bold text-neutral-300">Exemple inspirant :</p>
                    <p>« Je suis une personne disciplinée qui honore ses engagements. Je suis un apprenant passionné qui cherche constamment à s’améliorer. Je suis un créateur de valeur d'élite qui attire naturellement l’abondance financière. Je suis résilient face aux défis et je vois les obstacles comme des opportunités de croissance. »</p>
                  </div>
                  <textarea
                    rows={4}
                    value={userAnswers[activeSection.exerciseId] || ""}
                    onChange={(e) => handleTextAnswerChange(activeSection.exerciseId, e.target.value)}
                    placeholder="Écrivez votre propre déclaration solennelle d'identité Élite..."
                    className="w-full p-4 rounded-2xl bg-black border border-white/10 focus:border-[#C9A84C]/50 text-neutral-200 text-xs focus:outline-none transition-colors"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        triggerCompletionCelebration();
                        alert("Félicitations, Déclaration d'identité d'élite scellée ! Elle est désormais active.");
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#C9A84C] text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:scale-102 transition-transform"
                    >
                      <Save size={12} /> Sceller ma déclaration
                    </button>
                  </div>
                </div>
              )}

              {/* Type: HABIT DESIGNER */}
              {activeSection.exerciseType === "habit_designer" && (
                <div className="space-y-4">
                  <label className="text-xs font-bold text-white block">
                    {activeSection.exerciseLabel}
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-neutral-500">1. Habitude souhaitée</span>
                      <input
                        type="text"
                        value={habitBlueprint.habit}
                        onChange={(e) => setHabitBlueprint({ ...habitBlueprint, habit: e.target.value })}
                        className="w-full p-3 rounded-xl bg-black border border-white/5 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-neutral-500">2. Déclencheur Évident</span>
                      <input
                        type="text"
                        value={habitBlueprint.trigger}
                        onChange={(e) => setHabitBlueprint({ ...habitBlueprint, trigger: e.target.value })}
                        className="w-full p-3 rounded-xl bg-black border border-white/5 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-neutral-500">3. Envie Attractive</span>
                      <input
                        type="text"
                        value={habitBlueprint.craving}
                        onChange={(e) => setHabitBlueprint({ ...habitBlueprint, craving: e.target.value })}
                        className="w-full p-3 rounded-xl bg-black border border-white/5 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-neutral-500">4. Version Facile (2 min)</span>
                      <input
                        type="text"
                        value={habitBlueprint.easyStart}
                        onChange={(e) => setHabitBlueprint({ ...habitBlueprint, easyStart: e.target.value })}
                        className="w-full p-3 rounded-xl bg-black border border-white/5 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <span className="text-[9px] font-black uppercase text-neutral-500">5. Récompense Satisfaisante</span>
                      <input
                        type="text"
                        value={habitBlueprint.reward}
                        onChange={(e) => setHabitBlueprint({ ...habitBlueprint, reward: e.target.value })}
                        className="w-full p-3 rounded-xl bg-black border border-white/5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        triggerCelebrationSparkles();
                        alert("Plan d'habitude validé ! Mettez-le en application dès ce soir.");
                      }}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                    >
                      <Save size={12} /> Enregistrer mon plan d'habitude
                    </button>
                  </div>
                </div>
              )}

              {/* Type: FEAR MAPPING */}
              {activeSection.exerciseType === "fear_mapping" && (
                <div className="space-y-4">
                  <label className="text-xs font-bold text-white block">
                    {activeSection.exerciseLabel}
                  </label>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black uppercase text-neutral-500">Ma Peur Majeure</span>
                      <input
                        type="text"
                        value={fearMap.fear}
                        onChange={(e) => setFearMap({ ...fearMap, fear: e.target.value })}
                        className="w-full p-3 rounded-xl bg-black border border-white/5 text-xs text-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-red-500/80">Le Pire Scénario Imaginable</span>
                        <textarea
                          rows={2}
                          value={fearMap.worst}
                          onChange={(e) => setFearMap({ ...fearMap, worst: e.target.value })}
                          className="w-full p-3 rounded-xl bg-black border border-red-500/10 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-emerald-500/80">Le Meilleur Scénario Réel</span>
                        <textarea
                          rows={2}
                          value={fearMap.best}
                          onChange={(e) => setFearMap({ ...fearMap, best: e.target.value })}
                          className="w-full p-3 rounded-xl bg-black border border-emerald-500/10 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-blue-500/80">Le Scénario le Plus Probable</span>
                        <textarea
                          rows={2}
                          value={fearMap.probable}
                          onChange={(e) => setFearMap({ ...fearMap, probable: e.target.value })}
                          className="w-full p-3 rounded-xl bg-black border border-blue-500/10 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-[#C9A84C]/80">Plan d'Action Minimal (24 Heures)</span>
                        <textarea
                          rows={2}
                          value={fearMap.minimalAction}
                          onChange={(e) => setFearMap({ ...fearMap, minimalAction: e.target.value })}
                          className="w-full p-3 rounded-xl bg-black border border-[#C9A84C]/10 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        triggerCelebrationSparkles();
                        alert("Cartographie enregistrée. Passez à l'action immédiate pour terrasser cette peur !");
                      }}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                    >
                      <Save size={12} /> Sauvegarder la cartographie
                    </button>
                  </div>
                </div>
              )}

              {/* Type: SMART GOALS */}
              {activeSection.exerciseType === "smart_goals" && (
                <div className="space-y-4">
                  <label className="text-xs font-bold text-white block">
                    {activeSection.exerciseLabel}
                  </label>

                  <div className="space-y-3 text-left">
                    <div className="p-3 bg-black rounded-xl border border-white/5 flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-black text-xs text-[#C9A84C] shrink-0">S</div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Spécifique (Quoi exactement ?)</p>
                        <input type="text" value={smartGoal.s} onChange={e => setSmartGoal({...smartGoal, s: e.target.value})} className="w-full bg-transparent text-xs text-white font-bold outline-none border-b border-white/5 py-1 focus:border-[#C9A84C]" />
                      </div>
                    </div>
                    <div className="p-3 bg-black rounded-xl border border-white/5 flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-black text-xs text-[#C9A84C] shrink-0">M</div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Mesurable (Comment quantifier la progression ?)</p>
                        <input type="text" value={smartGoal.m} onChange={e => setSmartGoal({...smartGoal, m: e.target.value})} className="w-full bg-transparent text-xs text-white font-bold outline-none border-b border-white/5 py-1 focus:border-[#C9A84C]" />
                      </div>
                    </div>
                    <div className="p-3 bg-black rounded-xl border border-white/5 flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-black text-xs text-[#C9A84C] shrink-0">A</div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Atteignable (Est-ce réaliste ?)</p>
                        <input type="text" value={smartGoal.a} onChange={e => setSmartGoal({...smartGoal, a: e.target.value})} className="w-full bg-transparent text-xs text-white font-bold outline-none border-b border-white/5 py-1 focus:border-[#C9A84C]" />
                      </div>
                    </div>
                    <div className="p-3 bg-black rounded-xl border border-white/5 flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-black text-xs text-[#C9A84C] shrink-0">R</div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Réaliste (En accord avec vos valeurs actuelles ?)</p>
                        <input type="text" value={smartGoal.r} onChange={e => setSmartGoal({...smartGoal, r: e.target.value})} className="w-full bg-transparent text-xs text-white font-bold outline-none border-b border-white/5 py-1 focus:border-[#C9A84C]" />
                      </div>
                    </div>
                    <div className="p-3 bg-black rounded-xl border border-white/5 flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-black text-xs text-[#C9A84C] shrink-0">T</div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Temporellement défini (Quelle est la date limite ?)</p>
                        <input type="text" value={smartGoal.t} onChange={e => setSmartGoal({...smartGoal, t: e.target.value})} className="w-full bg-transparent text-xs text-white font-bold outline-none border-b border-white/5 py-1 focus:border-[#C9A84C]" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        triggerCompletionCelebration();
                        alert("Objectif SMART d'élite validé et gravé dans le marbre ! Restez focus.");
                      }}
                      className="px-4 py-2 rounded-xl bg-[#C9A84C] text-black text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                    >
                      <Save size={12} /> Enregistrer mon objectif SMART
                    </button>
                  </div>
                </div>
              )}

              {/* Type: 30 DAYS CHALLENGE */}
              {activeSection.exerciseType === "day30_challenge" && (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-black border border-white/5 text-left space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-black uppercase text-[#C9A84C] tracking-widest">
                        DÉFI DES 30 JOURS MINDSET
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">
                        Streak : {completedDays.length} jours validés
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Cliquez sur n’importe quel jour pour afficher sa mission, et cochez-la une fois accomplie. Bâtissez votre discipline de fer jour par jour !
                    </p>
                  </div>

                  {/* Calendar Grid of 30 days */}
                  <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-10 gap-2">
                    {THIRTY_DAYS_TASKS.map(task => {
                      const isDone = completedDays.includes(task.day);
                      return (
                        <button
                          key={task.day}
                          onClick={() => toggleDayComplete(task.day)}
                          title={`${task.title} : ${task.desc}`}
                          className={`aspect-square rounded-xl border flex flex-col items-center justify-center transition-all ${
                            isDone
                              ? "bg-gradient-to-br from-[#1C1A14] to-black border-[#C9A84C] text-[#C9A84C] shadow-[0_0_12px_rgba(201,168,76,0.3)] scale-102"
                              : "bg-black border-white/10 text-neutral-400 hover:border-white/20"
                          }`}
                        >
                          <span className="text-[10px] font-black leading-none">{task.day}</span>
                          <span className="text-[6px] uppercase tracking-tighter mt-1 opacity-50 block truncate max-w-[40px]">
                            {isDone ? "OK" : "Jour"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Task Detail Panel of selection */}
                  <div className="p-5 rounded-2xl bg-neutral-950 border border-white/5 text-left space-y-4">
                    <span className="text-[8px] font-black uppercase text-[#C9A84C] tracking-widest flex items-center gap-1">
                      <Flame size={10} className="text-amber-500" /> RÉPERTOIRE DES MISSIONS
                    </span>

                    <div className="space-y-3 divide-y divide-white/5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {THIRTY_DAYS_TASKS.map(task => {
                        const isDone = completedDays.includes(task.day);
                        return (
                          <div key={task.day} className="pt-3 flex items-start justify-between gap-4">
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-bold text-white flex items-center gap-2">
                                <span className={`px-1 rounded text-[8px] ${isDone ? 'bg-[#C9A84C]/20 text-[#C9A84C]' : 'bg-neutral-800 text-neutral-400'}`}>
                                  Jour {task.day}
                                </span>
                                <span>{task.title}</span>
                              </p>
                              <p className="text-[10px] text-neutral-400">{task.desc}</p>
                            </div>

                            <button
                              onClick={() => toggleDayComplete(task.day)}
                              className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all shrink-0 ${
                                isDone
                                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                                  : "bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10"
                              }`}
                            >
                              {isDone ? "Validé ✓" : "Valider"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION AREA TO MARK ENTIRE SECTION AS READ AND PROGRESS */}
              <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5">
                <button
                  disabled={activeSectionIdx === 0}
                  onClick={() => setActiveSectionIdx(prev => prev - 1)}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-white/10 hover:bg-white/5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-20 disabled:pointer-events-none"
                >
                  <ChevronLeft size={16} /> Précédent
                </button>

                <button
                  onClick={markSectionComplete}
                  className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all ${
                    completedSections.includes(activeSection.id)
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      : "bg-gradient-to-r from-[#FFF2D4] via-[#C9A84C] to-[#8C712B] text-black hover:opacity-90 shadow-md"
                  }`}
                >
                  {completedSections.includes(activeSection.id) ? (
                    <>Lu & Maîtrisé ✓</>
                  ) : (
                    <>Marquer comme Lu (+50 XP)</>
                  )}
                </button>

                <button
                  disabled={activeSectionIdx === currentSections.length - 1}
                  onClick={() => setActiveSectionIdx(prev => prev + 1)}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-white/10 hover:bg-white/5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-20 disabled:pointer-events-none"
                >
                  Suivant <ChevronRight size={16} />
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>
    </>

    </div>
  );
};
