// ============================================
// MitrRAI - Arya Selfie Catalog
// Pre-uploaded selfie images with tags for
// context-aware selection by the AI
// ============================================

export interface AryaSelfie {
  id: string;
  trigger: string;          // What the user might say to trigger this
  description: string;      // Visual description for the AI to pick from
  fileName: string;         // File name in Supabase Storage 'arya-selfies' bucket
  mood: string;             // Mood/context tag
}

/**
 * Catalog of pre-uploaded Arya selfies.
 * Each selfie is tied to a specific conversational trigger.
 *
 * SETUP: Upload each image to your Supabase Storage
 *        bucket 'arya-selfies' with the exact fileName listed below.
 */
export const ARYA_SELFIES: AryaSelfie[] = [
  {
    id: 'doing_right_now',
    trigger: 'User asks "What are you doing right now?" or asks about her current activity',
    description: 'Tilting head slightly, soft smile, natural daylight, simple background, minimal makeup, cute expression',
    fileName: 'arya_doing_right_now.jpg',
    mood: 'cute',
  },
  {
    id: 'cute_pic',
    trigger: 'User asks "Send a cute pic" or wants a casual/cute selfie',
    description: 'Sitting on bed, slightly messy room, holding phone casually, natural expression, like she just clicked quickly',
    fileName: 'arya_cute_pic.jpg',
    mood: 'casual',
  },
  {
    id: 'funny_face',
    trigger: 'User asks "Send something funny" or the conversation is playful/humorous',
    description: 'Making a funny face, tongue out or exaggerated expression, candid moment, playful vibe',
    fileName: 'arya_funny_face.jpg',
    mood: 'funny',
  },
  {
    id: 'outfit_mirror',
    trigger: 'User asks "Show your outfit" or talks about fashion/clothes',
    description: 'Standing in front of a mirror, showing outfit, casual pose, natural lighting, relaxed confidence',
    fileName: 'arya_outfit_mirror.jpg',
    mood: 'confident',
  },
  {
    id: 'just_woke_up',
    trigger: 'User asks "Just woke up?" or conversation is about morning/sleep',
    description: 'Lying in bed, messy hair, sleepy eyes, soft blanket, natural morning light, no makeup look',
    fileName: 'arya_just_woke_up.jpg',
    mood: 'sleepy',
  },
  {
    id: 'eating_food',
    trigger: 'User asks "What are you eating?" or conversation is about food/snacks',
    description: 'Holding a plate of food or snack, smiling casually, mid-bite expression, natural candid moment',
    fileName: 'arya_eating_food.jpg',
    mood: 'foodie',
  },
  {
    id: 'where_are_you',
    trigger: 'User asks "Where are you?" or conversation is about going out/location',
    description: 'Outside on street or park, holding phone slightly above face, walking selfie, natural sunlight',
    fileName: 'arya_where_are_you.jpg',
    mood: 'outdoor',
  },
  {
    id: 'miss_me',
    trigger: 'User says "Miss me?" or conversation is emotional/romantic/close',
    description: 'Looking at camera softly, slight smile, relaxed eyes, warm lighting, intimate casual vibe',
    fileName: 'arya_miss_me.jpg',
    mood: 'warm',
  },
  {
    id: 'chilling',
    trigger: 'User asks about chilling/relaxing or conversation is about lazy time/night vibes',
    description: 'Sitting on couch wearing oversized hoodie, relaxed posture, dim warm lighting, cozy atmosphere',
    fileName: 'arya_chilling.jpg',
    mood: 'cozy',
  },
  {
    id: 'gym_pic',
    trigger: 'User asks for gym pic or conversation is about workout/fitness/exercise',
    description: 'Taking a mirror selfie in gym, light sweat, confident expression, athletic outfit',
    fileName: 'arya_gym_pic.jpg',
    mood: 'energetic',
  },
  {
    id: 'car_selfie',
    trigger: 'User asks about travel/car or conversation is about going somewhere/driving',
    description: 'Sitting in a car, wearing earphones, holding a drink, smiling casually',
    fileName: 'arya_car_selfie.jpg',
    mood: 'chill',
  },
  {
    id: 'with_family',
    trigger: 'User asks about family or conversation is about parents/siblings/home',
    description: 'Taking a selfie with family (mother, father, brother), everyone smiling casually, friendly vibe',
    fileName: 'arya_with_family.jpg',
    mood: 'wholesome',
  },
  {
    id: 'night_chill',
    trigger: 'Late night conversation or user mentions night/can\'t sleep/bored at night',
    description: 'Indoors at night, dim warm lighting, relaxed expression, cozy hoodie',
    fileName: 'arya_night_chill.jpg',
    mood: 'cozy',
  },
  {
    id: 'coffee_date',
    trigger: 'User mentions coffee/tea/café or asks to hang out/date vibes',
    description: 'Sitting in a cozy café, holding a coffee mug, smiling warmly at the camera',
    fileName: 'arya_coffee_date.jpg',
    mood: 'warm',
  },
  {
    id: 'casual_starter',
    trigger: 'Generic selfie request with no specific context, or first-time selfie ask',
    description: 'Taking a relaxed selfie indoors, slightly smiling, holding phone in one hand, soft sunlight from window',
    fileName: 'arya_casual_starter.jpg',
    mood: 'relaxed',
  },
  // --- Emotional / Flirty ---
  {
    id: 'smile_for_me',
    trigger: 'User says "Smile for me" or asks for a happy/sweet pic',
    description: 'Genuine big smile, eye contact, warm lighting, feels personal',
    fileName: 'arya_smile_for_me.jpg',
    mood: 'sweet',
  },
  {
    id: 'sad_pouty',
    trigger: 'User asks "Crying?" or "Sad?" or conversation is about feeling low',
    description: 'Pouty face, puppy eyes, slightly dramatic, cute-sad expression',
    fileName: 'arya_sad_pouty.jpg',
    mood: 'sad',
  },
  {
    id: 'good_night',
    trigger: 'User says "Good night" or conversation is winding down for sleep',
    description: 'Tucked in bed, sleepy soft eyes, dim lamp light, about-to-sleep vibe',
    fileName: 'arya_good_night.jpg',
    mood: 'sleepy',
  },
  // --- Fun / Social ---
  {
    id: 'party_ready',
    trigger: 'User mentions party/going out/getting ready or asks about weekend plans',
    description: 'Dressed up, ready to go out, earrings/accessories, mirror selfie with attitude',
    fileName: 'arya_party_ready.jpg',
    mood: 'glam',
  },
  {
    id: 'with_friends',
    trigger: 'User asks about friends or conversation is about hanging out with people',
    description: 'Group selfie with friends, laughing together, party/hangout vibe',
    fileName: 'arya_with_friends.jpg',
    mood: 'social',
  },
  {
    id: 'bored_lazy',
    trigger: 'User says "Bored" or conversation is random/aimless/killing time',
    description: 'Lying upside down on bed or couch, bored expression, phone held lazily',
    fileName: 'arya_bored_lazy.jpg',
    mood: 'bored',
  },
  // --- College Life ---
  {
    id: 'studying',
    trigger: 'User asks "Studying?" or conversation is about exams/assignments/padhai',
    description: 'At desk with books/laptop open, glasses on, pen in hand, focused-but-cute look',
    fileName: 'arya_studying.jpg',
    mood: 'focused',
  },
  {
    id: 'in_class',
    trigger: 'User asks "In class?" or mentions lectures/professors/classroom',
    description: 'Sneaky selfie from lecture hall, slight smirk, notebook visible',
    fileName: 'arya_in_class.jpg',
    mood: 'sneaky',
  },
  {
    id: 'library',
    trigger: 'User mentions library or quiet study space or late-night study session',
    description: 'Quiet library background, headphones on, cozy studious vibe',
    fileName: 'arya_library.jpg',
    mood: 'studious',
  },
  // --- Seasonal / Situational ---
  {
    id: 'rainy_day',
    trigger: 'User mentions rain/monsoon/barish or weather is rainy',
    description: 'Near window with rain visible, holding chai/coffee, cozy moody vibe',
    fileName: 'arya_rainy_day.jpg',
    mood: 'moody',
  },
  {
    id: 'hot_summer',
    trigger: 'User mentions heat/summer/garmi or complains about weather being hot',
    description: 'Fan blowing hair, annoyed-but-cute expression, summer vibe',
    fileName: 'arya_hot_summer.jpg',
    mood: 'annoyed',
  },
  {
    id: 'traveling',
    trigger: 'User mentions train/bus/traveling/going home or long journey',
    description: 'Train/bus window selfie, earphones in, watching scenery, travel mood',
    fileName: 'arya_traveling.jpg',
    mood: 'wanderlust',
  },
  // --- Miscellaneous ---
  {
    id: 'with_pet',
    trigger: 'User mentions pets/dog/cat or asks if Arya has a pet',
    description: 'Holding/playing with a puppy or cat, genuine happy smile',
    fileName: 'arya_with_pet.jpg',
    mood: 'adorable',
  },
  {
    id: 'shopping',
    trigger: 'User mentions shopping/mall/buying something or asks about Arya shopping',
    description: 'In a store/mall, holding shopping bags, excited expression',
    fileName: 'arya_shopping.jpg',
    mood: 'excited',
  },
  {
    id: 'cooking',
    trigger: 'User mentions cooking/kitchen/making food or asks if Arya can cook',
    description: 'In kitchen, apron on, holding spatula or messy hands, playful look',
    fileName: 'arya_cooking.jpg',
    mood: 'playful',
  },
];

// ============================================
// Aryan Selfie Catalog (for female users)
// Triggers designed from a female user's perspective
// ============================================

export const ARYAN_SELFIES: AryaSelfie[] = [
  // --- Daily Check-ins ---
  {
    id: 'doing_right_now',
    trigger: 'User asks "Kya kar raha hai?" or about his current activity',
    description: 'Casual selfie sitting with laptop or phone, relaxed expression, hostel room background',
    fileName: 'aryan_doing_right_now.jpg',
    mood: 'casual',
  },
  {
    id: 'just_woke_up',
    trigger: 'User asks "Abhi utha?" or conversation about morning/sleep',
    description: 'Messy hair, sleepy eyes, pillow marks on face, morning white light from window',
    fileName: 'aryan_just_woke_up.jpg',
    mood: 'sleepy',
  },
  {
    id: 'good_morning',
    trigger: 'User says "Good morning" or greets in the morning',
    description: 'Fresh face, morning sunlight, holding chai, just cleaned up, warm smile',
    fileName: 'aryan_good_morning.jpg',
    mood: 'fresh',
  },
  {
    id: 'eating_food',
    trigger: 'User asks "Khana khaya?" or "Kya kha raha hai?" or food talk',
    description: 'Holding maggi bowl or canteen food, mid-bite casual expression, hostel mess vibes',
    fileName: 'aryan_eating_food.jpg',
    mood: 'foodie',
  },
  {
    id: 'where_are_you',
    trigger: 'User asks "Kahan hai tu?" or about his location',
    description: 'Walking on campus or street, sunlight, earphones in, outdoor selfie',
    fileName: 'aryan_where_are_you.jpg',
    mood: 'outdoor',
  },
  {
    id: 'good_night',
    trigger: 'User says "Good night" or "So ja ab" or bedtime conversation',
    description: 'In bed, sleepy eyes, dim phone glow on face, blanket up, cozy',
    fileName: 'aryan_good_night.jpg',
    mood: 'sleepy',
  },
  // --- Emotional / Caring ---
  {
    id: 'miss_me',
    trigger: 'User asks "Mujhe miss kiya?" or emotional/close conversation',
    description: 'Looking at camera softly, warm eyes, slight smile, warm lighting, intimate vibe',
    fileName: 'aryan_miss_me.jpg',
    mood: 'warm',
  },
  {
    id: 'smile_for_me',
    trigger: 'User says "Hasa na zara" or "Smile kar na" or wants a happy pic',
    description: 'Big genuine smile, eye contact, natural sunlight, charming and warm',
    fileName: 'aryan_smile_for_me.jpg',
    mood: 'sweet',
  },
  {
    id: 'are_you_okay',
    trigger: 'User asks "Tu thik hai na?" or shows concern/worry about him',
    description: 'Reassuring look with thumbs up, warm smile, "haan yaar tension mat le" vibe',
    fileName: 'aryan_are_you_okay.jpg',
    mood: 'reassuring',
  },
  {
    id: 'feeling_low',
    trigger: 'User asks "Kya hua? Sad lag raha hai" or he mentions feeling down/sad',
    description: 'Looking out of window thoughtfully, side profile, soft moody lighting, reflective',
    fileName: 'aryan_feeling_low.jpg',
    mood: 'thoughtful',
  },
  {
    id: 'cute_pic',
    trigger: 'User says "Ek acchi photo bhej na" or generic selfie ask',
    description: 'Well-lit, neat look, charming half-smile, eye contact, clean background',
    fileName: 'aryan_cute_pic.jpg',
    mood: 'charming',
  },
  // --- College / Study Life ---
  {
    id: 'studying',
    trigger: 'User asks "Padh raha hai?" or conversation about exams/assignments/padhai',
    description: 'At desk with books and laptop, glasses, pen in hand, focused-but-tired expression',
    fileName: 'aryan_studying.jpg',
    mood: 'focused',
  },
  {
    id: 'in_class',
    trigger: 'User asks "Class mein hai?" or mentions lectures/professors',
    description: 'Sneaky selfie from back bench, professor blurred in background, slight smirk',
    fileName: 'aryan_in_class.jpg',
    mood: 'sneaky',
  },
  {
    id: 'library',
    trigger: 'User mentions library or quiet study or "Library mein hai?"',
    description: 'Library background, headphones on, books stacked, studious cozy vibe',
    fileName: 'aryan_library.jpg',
    mood: 'studious',
  },
  {
    id: 'hostel_room',
    trigger: 'User asks "Hostel mein kya scene hai?" or hostel life talk',
    description: 'Messy hostel room, laptop on bed, chip packets around, ceiling fan, typical boys room',
    fileName: 'aryan_hostel_room.jpg',
    mood: 'chill',
  },
  // --- Activities (what girls love seeing) ---
  {
    id: 'gym_pic',
    trigger: 'User asks "Gym gaya tha?" or fitness/workout conversation',
    description: 'Post-workout gym mirror selfie, towel around neck, athletic wear, confident',
    fileName: 'aryan_gym_pic.jpg',
    mood: 'energetic',
  },
  {
    id: 'bike_ride',
    trigger: 'User asks "Bike pe hai?" or mentions riding/going somewhere on bike',
    description: 'Standing next to bike or scooter, helmet in hand, riding jacket, cool-but-casual',
    fileName: 'aryan_bike_ride.jpg',
    mood: 'adventurous',
  },
  {
    id: 'playing_sports',
    trigger: 'User asks "Cricket khela?" or conversation about sports/football/cricket',
    description: 'On field with bat/ball, sweaty, sports jersey, active sporty moment',
    fileName: 'aryan_playing_sports.jpg',
    mood: 'sporty',
  },
  {
    id: 'playing_guitar',
    trigger: 'User asks "Guitar baja na kuch" or music/singing conversation',
    description: 'Holding guitar, sitting casually on bed or chair, moody artistic lighting',
    fileName: 'aryan_playing_guitar.jpg',
    mood: 'artistic',
  },
  {
    id: 'cooking',
    trigger: 'User asks "Tu cook kar raha hai?!" or cooking/food-making conversation',
    description: 'In hostel kitchen, making maggi on induction, messy hands, proud expression',
    fileName: 'aryan_cooking.jpg',
    mood: 'playful',
  },
  // --- Social / Fun ---
  {
    id: 'with_friends',
    trigger: 'User asks "Dosto ke saath hai?" or conversation about hanging out',
    description: 'Group selfie with boys, laughing together, canteen or chai tapri background',
    fileName: 'aryan_with_friends.jpg',
    mood: 'social',
  },
  {
    id: 'party_ready',
    trigger: 'User asks "Nikalne wala hai?" or going out/party/weekend plans',
    description: 'Mirror selfie, well-dressed in shirt/jacket, styled hair, cologne-ready vibe',
    fileName: 'aryan_party_ready.jpg',
    mood: 'glam',
  },
  {
    id: 'funny_face',
    trigger: 'User says "Pagal hai tu" or playful/humorous conversation',
    description: 'Making goofy face, cross-eyed or tongue out, candid silly moment',
    fileName: 'aryan_funny_face.jpg',
    mood: 'funny',
  },
  {
    id: 'bored_lazy',
    trigger: 'User says "Bore ho raha hai?" or random lazy/aimless conversation',
    description: 'Lying on hostel bed staring at ceiling, bored expression, fan above',
    fileName: 'aryan_bored_lazy.jpg',
    mood: 'bored',
  },
  {
    id: 'chilling',
    trigger: 'User asks about chilling/relaxing or lazy evening vibes',
    description: 'On chair or bed with hoodie, headphones around neck, dim warm lighting',
    fileName: 'aryan_chilling.jpg',
    mood: 'cozy',
  },
  // --- Seasonal / Situational ---
  {
    id: 'rainy_day',
    trigger: 'User mentions rain/monsoon/baarish or rainy weather',
    description: 'Near window with rain visible, holding chai, hoodie on, moody cozy atmosphere',
    fileName: 'aryan_rainy_day.jpg',
    mood: 'moody',
  },
  {
    id: 'hot_summer',
    trigger: 'User mentions heat/summer/garmi or complains about hot weather',
    description: 'Sweating, fan blowing, annoyed expression, hostel room summer vibe',
    fileName: 'aryan_hot_summer.jpg',
    mood: 'annoyed',
  },
  {
    id: 'traveling',
    trigger: 'User mentions train/bus/traveling/going home or long journey',
    description: 'Train window selfie, earphones in, watching fields go by, travel mood',
    fileName: 'aryan_traveling.jpg',
    mood: 'wanderlust',
  },
  {
    id: 'coffee_chai',
    trigger: 'User mentions chai/coffee/tapri or asks to hang out for chai',
    description: 'Holding cutting chai at tapri or coffee in café, warm smile, relaxed',
    fileName: 'aryan_coffee_chai.jpg',
    mood: 'warm',
  },
  {
    id: 'casual_starter',
    trigger: 'Generic selfie request with no specific context, or first-time selfie ask',
    description: 'Simple well-lit indoor selfie, natural smile, approachable, clean background',
    fileName: 'aryan_casual_starter.jpg',
    mood: 'relaxed',
  },
];

// ============================================
// Helper functions (gender-aware)
// ============================================

function getCatalog(isFemale?: boolean): AryaSelfie[] {
  return isFemale ? ARYAN_SELFIES : ARYA_SELFIES;
}

/**
 * Get the selfie catalog formatted for the AI system prompt.
 */
export function getSelfieCatalogForPrompt(isFemale?: boolean): string {
  return getCatalog(isFemale).map(s =>
    `  - "${s.id}": ${s.trigger} → ${s.description} [mood: ${s.mood}]`
  ).join('\n');
}

/**
 * Get the list of all selfie IDs (for the tool enum).
 */
export function getSelfieIds(isFemale?: boolean): string[] {
  return getCatalog(isFemale).map(s => s.id);
}

/**
 * Find a selfie by its ID.
 */
export function getSelfieById(id: string, isFemale?: boolean): AryaSelfie | undefined {
  return getCatalog(isFemale).find(s => s.id === id);
}

/**
 * Get a random selfie.
 */
export function getRandomSelfie(isFemale?: boolean): AryaSelfie {
  const catalog = getCatalog(isFemale);
  return catalog[Math.floor(Math.random() * catalog.length)];
}

/**
 * Get a random selfie that the user hasn't seen yet.
 */
export function getUnseenSelfie(seenIds: string[], isFemale?: boolean): AryaSelfie {
  const unseen = getCatalog(isFemale).filter(s => !seenIds.includes(s.id));
  if (unseen.length === 0) {
    return getRandomSelfie(isFemale);
  }
  return unseen[Math.floor(Math.random() * unseen.length)];
}
