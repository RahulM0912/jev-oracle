import "server-only";
import type { Category, Secret, SecretLevel } from "./secret";

// Hand-picked secrets for Jev's Secret. Server-only so the list never ships to the browser.
// Rules for adding one:
// - everyone knows it and it has one obvious everyday name
// - not ambiguous within its category, and no real living people
// Format: "name|alias|alias". Aliases are accepted as correct guesses without asking Jev.

const RAW: Record<Category, Record<SecretLevel, string[]>> = {
  animals: {
    easy: [
      "dog|puppy", "cat|kitten", "horse", "cow", "pig", "sheep|lamb", "chicken|hen", "duck", "elephant", "giraffe",
      "lion", "tiger", "bear", "monkey", "zebra", "penguin", "dolphin", "shark", "whale", "snake",
      "frog", "rabbit|bunny", "mouse", "owl", "eagle", "butterfly", "bee|honeybee", "spider", "kangaroo", "crocodile",
    ],
    hard: [
      "octopus", "platypus", "sloth", "hedgehog", "flamingo", "peacock", "jellyfish", "chameleon", "koala", "panda|giant panda",
      "camel", "squirrel", "bat", "raccoon", "seahorse", "ostrich", "hippopotamus|hippo", "rhinoceros|rhino", "snail", "lobster",
    ],
  },
  food: {
    easy: [
      "pizza", "banana", "apple", "ice cream", "chocolate", "bread", "cheese", "egg", "rice", "carrot",
      "potato", "tomato", "orange", "strawberry", "watermelon", "hamburger|burger", "sandwich", "cake", "cookie|biscuit", "popcorn",
      "milk", "honey", "pasta|spaghetti", "soup", "french fries|fries|chips",
    ],
    hard: [
      "sushi", "taco", "pineapple", "avocado", "mushroom", "coconut", "pretzel", "pancake", "doughnut|donut", "lemon",
      "broccoli", "garlic", "croissant", "peanut butter", "dumpling",
    ],
  },
  objects: {
    easy: [
      "chair", "table", "bed", "toothbrush", "umbrella", "clock", "phone|mobile phone|smartphone|cell phone", "television|tv", "book", "pencil",
      "scissors", "key", "spoon", "cup|mug", "shoe", "hat", "glasses|spectacles|eyeglasses", "ball", "candle", "mirror",
      "lamp", "door", "pillow", "backpack|rucksack|school bag", "camera", "guitar", "piano", "refrigerator|fridge", "toaster", "computer|laptop",
    ],
    hard: [
      "stapler", "compass", "hourglass", "kite", "ladder", "magnet", "microscope", "telescope", "violin", "trumpet",
      "paintbrush", "envelope", "padlock|lock", "hammer", "sewing machine", "light bulb|lightbulb|bulb", "balloon", "wallet", "calendar", "globe",
    ],
  },
  places: {
    easy: [
      "beach", "school", "hospital", "library", "airport", "zoo", "farm", "forest", "desert", "mountain",
      "island", "kitchen", "park", "supermarket|grocery store", "castle", "volcano", "moon|the moon", "sun|the sun", "Eiffel Tower", "Statue of Liberty",
      "Great Wall of China|Great Wall", "pyramids of Giza|pyramids|the pyramids", "Antarctica", "Paris", "London",
    ],
    hard: [
      "Mount Everest|Everest", "Sahara|Sahara Desert", "Amazon rainforest|Amazon", "Grand Canyon", "Taj Mahal", "Colosseum|Coliseum", "Mars", "Saturn", "Niagara Falls", "Big Ben",
      "Stonehenge", "Tokyo", "Venice", "Mount Fuji|Fuji", "Leaning Tower of Pisa|Tower of Pisa",
    ],
  },
  vehicles: {
    easy: [
      "car", "bicycle|bike", "bus", "train", "airplane|plane|aeroplane", "boat", "helicopter", "motorcycle|motorbike", "truck|lorry", "rocket",
      "ship", "tractor",
    ],
    hard: ["submarine", "hot air balloon", "skateboard", "ambulance", "fire truck|fire engine", "robot", "excavator|digger", "tram|streetcar"],
  },
  countries: {
    easy: [
      "United States|USA|US|United States of America|America", "Canada", "Mexico", "Brazil", "Argentina",
      "United Kingdom|UK|Britain|Great Britain", "France", "Germany", "Italy", "Spain",
      "Russia", "China", "Japan", "India", "Australia", "Egypt", "South Africa", "Nigeria", "Kenya", "Saudi Arabia",
      "Turkey|Turkiye", "Greece", "Ireland", "Netherlands|Holland", "Sweden", "Norway", "Switzerland", "South Korea|Korea", "Thailand", "New Zealand",
    ],
    hard: [
      "Portugal", "Poland", "Iceland", "Peru", "Chile", "Colombia", "Cuba", "Jamaica", "Morocco", "Ethiopia",
      "Indonesia", "Vietnam|Viet Nam", "Philippines", "Nepal", "Mongolia", "Finland", "Denmark", "Austria", "Belgium", "Madagascar",
    ],
  },
};

export const SECRETS: (Secret & { category: Category; level: SecretLevel })[] = (Object.keys(RAW) as Category[]).flatMap((category) =>
  (["easy", "hard"] as const).flatMap((level) =>
    RAW[category][level].map((entry) => {
      const [name, ...aliases] = entry.split("|");
      return { name, aliases, category, level };
    }),
  ),
);
