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

/**
 * Get the selfie catalog formatted for the AI system prompt.
 * The AI sees trigger context + description and picks the best match.
 */
export function getSelfieCatalogForPrompt(): string {
  return ARYA_SELFIES.map(s =>
    `  - "${s.id}": ${s.trigger} → ${s.description} [mood: ${s.mood}]`
  ).join('\n');
}

/**
 * Find a selfie by its ID. Returns undefined if not found.
 */
export function getSelfieById(id: string): AryaSelfie | undefined {
  return ARYA_SELFIES.find(s => s.id === id);
}

/**
 * Get a random selfie (fallback when AI picks an invalid ID).
 */
export function getRandomSelfie(): AryaSelfie {
  return ARYA_SELFIES[Math.floor(Math.random() * ARYA_SELFIES.length)];
}

/**
 * Get a random selfie that the user hasn't seen yet.
 * If they've seen all, returns any random one.
 */
export function getUnseenSelfie(seenIds: string[]): AryaSelfie {
  const unseen = ARYA_SELFIES.filter(s => !seenIds.includes(s.id));
  if (unseen.length === 0) {
    // User has seen all — pick any random one
    return getRandomSelfie();
  }
  return unseen[Math.floor(Math.random() * unseen.length)];
}
