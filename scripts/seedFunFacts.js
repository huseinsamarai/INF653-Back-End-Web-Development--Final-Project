require('dotenv').config();

const connectDB = require('../config/db');
const States = require('../models/States');

const seedData = [
  {
    stateCode: 'KS',
    funfacts: [
      'Kansas has more miles of road than many states of similar size.',
      'The geographic center of the contiguous United States is in Kansas.',
      'Kansas is strongly associated with wheat production.',
    ],
  },
  {
    stateCode: 'MO',
    funfacts: [
      'Missouri has two major river borders, the Mississippi and Missouri Rivers.',
      'The first successful parachute jump from an airplane happened in Missouri.',
      'Missouri is home to the Gateway Arch in St. Louis.',
    ],
  },
  {
    stateCode: 'OK',
    funfacts: [
      'Oklahoma has a large number of tribal nations and sovereign tribal lands.',
      'The first parking meter in the world was installed in Oklahoma City.',
      'Oklahoma is often associated with the Great Plains and wide-open skies.',
    ],
  },
  {
    stateCode: 'NE',
    funfacts: [
      'Nebraska is the only state with a unicameral legislature.',
      'Nebraska is home to a famous sandhills region.',
      'The city of Kearney hosts the annual migration of sandhill cranes.',
    ],
  },
  {
    stateCode: 'CO',
    funfacts: [
      'Colorado has some of the highest average elevations in the United States.',
      'Denver is known as the Mile High City.',
      'Colorado has more than two thousand named mountains.',
    ],
  },
];

async function seed() {
  await connectDB();

  for (const item of seedData) {
    await States.updateOne(
      { stateCode: item.stateCode },
      { $setOnInsert: { stateCode: item.stateCode }, $addToSet: { funfacts: { $each: item.funfacts } } },
      { upsert: true }
    );
  }

  console.log('Seed data added successfully.');
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
