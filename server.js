require('dotenv').config();

const express = require('express');
const path = require('path');

const connectDB = require('./config/db');
const States = require('./models/States');
const verifyStates = require('./middleware/verifyStates');

const app = express();
const PORT = process.env.PORT || 3000;

const statesData = require('./statesData.json');

app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

function normalizeCode(code) {
  return String(code || '').toUpperCase();
}

function getStateName(code) {
  const state = statesData.find((item) => normalizeCode(item.code) === normalizeCode(code));
  return state ? state.state : code;
}

function mergeForList(stateData, funfactDoc) {
  const merged = { ...stateData };
  if (funfactDoc && Array.isArray(funfactDoc.funfacts) && funfactDoc.funfacts.length > 0) {
    merged.funfacts = funfactDoc.funfacts;
  }
  return merged;
}

function mergeForSingle(stateData, funfactDoc) {
  const merged = { ...stateData };
  if (funfactDoc) {
    merged.funfacts = Array.isArray(funfactDoc.funfacts) ? funfactDoc.funfacts : [];
  }
  return merged;
}

async function getFunfactDoc(code) {
  return States.findOne({ stateCode: normalizeCode(code) }).lean();
}

async function getMergedState(code, mode = 'single') {
  const stateData = statesData.find(
    (state) => normalizeCode(state.code) === normalizeCode(code)
  );

  if (!stateData) {
    return null;
  }

  const funfactDoc = await getFunfactDoc(code);

  if (mode === 'list') {
    return mergeForList(stateData, funfactDoc);
  }

  return mergeForSingle(stateData, funfactDoc);
}

function formatPopulation(value) {
  return Number(value).toLocaleString('en-US');
}

function send404(req, res) {
  if (req.accepts('html')) {
    return res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
  }

  return res.status(404).json({ error: '404 Not Found' });
}

const api = express.Router();

api.get('/', (req, res) => {
  res.json({ message: 'States API' });
});

api.get('/states', async (req, res, next) => {
  try {
    const { contig } = req.query;

    const docs = await States.find({}).lean();
    const docsMap = new Map(
      docs.map((doc) => [normalizeCode(doc.stateCode), doc.funfacts || []])
    );

    let results = statesData.map((state) => {
      const funfacts = docsMap.get(normalizeCode(state.code)) || [];
      const merged = { ...state };

      if (funfacts.length > 0) {
        merged.funfacts = funfacts;
      }

      return merged;
    });

    if (contig === 'true') {
      results = results.filter((state) => !['AK', 'HI'].includes(normalizeCode(state.code)));
    } else if (contig === 'false') {
      results = results.filter((state) => ['AK', 'HI'].includes(normalizeCode(state.code)));
    }

    return res.json(results);
  } catch (error) {
    return next(error);
  }
});

api.get('/states/:state', verifyStates, async (req, res, next) => {
  try {
    const merged = await getMergedState(req.code, 'single');

    if (!merged) {
      return res.status(404).json({ message: 'Invalid state abbreviation parameter' });
    }

    return res.json(merged);
  } catch (error) {
    return next(error);
  }
});

api.get('/states/:state/funfact', verifyStates, async (req, res, next) => {
  try {
    const merged = await getMergedState(req.code, 'single');

    if (!merged) {
      return res.status(404).json({ message: 'Invalid state abbreviation parameter' });
    }

    const stateName = merged.state;

    if (!merged.funfacts || merged.funfacts.length === 0) {
      return res.status(404).json({ message: `No Fun Facts found for ${stateName}` });
    }

    return res.json({ funfact: merged.funfacts[Math.floor(Math.random() * merged.funfacts.length)] });
  } catch (error) {
    return next(error);
  }
});

api.get('/states/:state/capital', verifyStates, async (req, res, next) => {
  try {
    const merged = await getMergedState(req.code, 'single');

    if (!merged) {
      return res.status(404).json({ message: 'Invalid state abbreviation parameter' });
    }

    return res.json({
      state: merged.state,
      capital: merged.capital_city,
    });
  } catch (error) {
    return next(error);
  }
});

api.get('/states/:state/nickname', verifyStates, async (req, res, next) => {
  try {
    const merged = await getMergedState(req.code, 'single');

    if (!merged) {
      return res.status(404).json({ message: 'Invalid state abbreviation parameter' });
    }

    return res.json({
      state: merged.state,
      nickname: merged.nickname,
    });
  } catch (error) {
    return next(error);
  }
});

api.get('/states/:state/population', verifyStates, async (req, res, next) => {
  try {
    const merged = await getMergedState(req.code, 'single');

    if (!merged) {
      return res.status(404).json({ message: 'Invalid state abbreviation parameter' });
    }

    return res.json({
      state: merged.state,
      population: formatPopulation(merged.population),
    });
  } catch (error) {
    return next(error);
  }
});

api.get('/states/:state/admission', verifyStates, async (req, res, next) => {
  try {
    const merged = await getMergedState(req.code, 'single');

    if (!merged) {
      return res.status(404).json({ message: 'Invalid state abbreviation parameter' });
    }

    return res.json({
      state: merged.state,
      admitted: merged.admission_date,
    });
  } catch (error) {
    return next(error);
  }
});

api.post('/states/:state/funfact', verifyStates, async (req, res, next) => {
  try {
    const { funfacts } = req.body;

    if (!funfacts) {
      return res.status(400).json({ message: 'State fun facts value required' });
    }

    if (!Array.isArray(funfacts)) {
      return res.status(400).json({ message: 'State fun facts value must be an array' });
    }

    const cleanFunfacts = funfacts
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);

    if (cleanFunfacts.length === 0) {
      return res.status(400).json({ message: 'State fun facts value must be an array' });
    }

    let doc = await States.findOne({ stateCode: req.code });

    if (!doc) {
      doc = new States({
        stateCode: req.code,
        funfacts: cleanFunfacts,
      });
    } else {
      doc.funfacts.push(...cleanFunfacts);
    }

    await doc.save();
    return res.status(201).json(doc.toObject());
  } catch (error) {
    return next(error);
  }
});

api.patch('/states/:state/funfact', verifyStates, async (req, res, next) => {
  try {
    const { index, funfact } = req.body;
    const stateName = getStateName(req.code);

    if (!index) {
      return res.status(400).json({ message: 'State fun fact index value required' });
    }

    if (typeof funfact !== 'string' || !funfact.trim()) {
      return res.status(400).json({ message: 'State fun fact value required' });
    }

    const parsedIndex = Number(index);
    if (!Number.isInteger(parsedIndex) || parsedIndex < 1) {
      return res.status(400).json({ message: 'State fun fact index value required' });
    }

    const doc = await States.findOne({ stateCode: req.code });

    if (!doc || !Array.isArray(doc.funfacts) || doc.funfacts.length === 0) {
      return res.status(404).json({ message: `No Fun Facts found for ${stateName}` });
    }

    const zeroBasedIndex = parsedIndex - 1;

    if (zeroBasedIndex < 0 || zeroBasedIndex >= doc.funfacts.length) {
      return res.status(404).json({ message: `No Fun Fact found at that index for ${stateName}` });
    }

    doc.funfacts[zeroBasedIndex] = funfact.trim();
    await doc.save();

    return res.json(doc.toObject());
  } catch (error) {
    return next(error);
  }
});

api.delete('/states/:state/funfact', verifyStates, async (req, res, next) => {
  try {
    const { index } = req.body;
    const stateName = getStateName(req.code);

    if (!index) {
      return res.status(400).json({ message: 'State fun fact index value required' });
    }

    const parsedIndex = Number(index);
    if (!Number.isInteger(parsedIndex) || parsedIndex < 1) {
      return res.status(400).json({ message: 'State fun fact index value required' });
    }

    const doc = await States.findOne({ stateCode: req.code });

    if (!doc || !Array.isArray(doc.funfacts) || doc.funfacts.length === 0) {
      return res.status(404).json({ message: `No Fun Facts found for ${stateName}` });
    }

    const zeroBasedIndex = parsedIndex - 1;

    if (zeroBasedIndex < 0 || zeroBasedIndex >= doc.funfacts.length) {
      return res.status(404).json({ message: `No Fun Fact found at that index for ${stateName}` });
    }

    doc.funfacts.splice(zeroBasedIndex, 1);
    await doc.save();

    return res.json(doc.toObject());
  } catch (error) {
    return next(error);
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/api', api);

app.use((req, res) => {
  send404(req, res);
});

app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).json({ error: 'Server Error' });
});

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();