require('dotenv').config();

const express = require('express');
const path = require('path');

const connectDB = require('./config/db');
const States = require('./models/States');
const verifyStates = require('./middleware/verifyStates');

const app = express();
const PORT = process.env.PORT || 3000;

const statesData = require('./statesData.json');

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

function mergeStateWithFunfacts(stateData, funfactDoc) {
  return {
    ...stateData,
    funfacts: Array.isArray(funfactDoc?.funfacts) ? funfactDoc.funfacts : [],
  };
}

async function getMergedState(code) {
  const stateData = statesData.find(
    (state) => normalizeCode(state.code) === normalizeCode(code)
  );

  if (!stateData) {
    return null;
  }

  const funfactDoc = await States.findOne({ stateCode: normalizeCode(code) }).lean();
  return mergeStateWithFunfacts(stateData, funfactDoc);
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function send404(req, res) {
  if (req.accepts('html')) {
    return res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
  }

  return res.status(404).json({ error: '404 Not Found' });
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/states', async (req, res, next) => {
  try {
    const { contig } = req.query;

    const docs = await States.find({}).lean();
    const funfactsByCode = new Map(
      docs.map((doc) => [normalizeCode(doc.stateCode), doc.funfacts || []])
    );

    let results = statesData.map((state) => ({
      ...state,
      funfacts: funfactsByCode.get(normalizeCode(state.code)) || [],
    }));

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

app.get('/states/:state', verifyStates, async (req, res, next) => {
  try {
    const merged = await getMergedState(req.code);

    if (!merged) {
      return send404(req, res);
    }

    return res.json(merged);
  } catch (error) {
    return next(error);
  }
});

app.get('/states/:state/funfact', verifyStates, async (req, res, next) => {
  try {
    const merged = await getMergedState(req.code);

    if (!merged) {
      return send404(req, res);
    }

    if (!merged.funfacts.length) {
      return res.status(404).json({ error: `No Fun Facts found for ${req.code}` });
    }

    return res.json({ funfact: randomItem(merged.funfacts) });
  } catch (error) {
    return next(error);
  }
});

app.get('/states/:state/capital', verifyStates, async (req, res, next) => {
  try {
    const merged = await getMergedState(req.code);

    if (!merged) {
      return send404(req, res);
    }

    return res.json({
      state: merged.state,
      capital: merged.capital_city,
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/states/:state/nickname', verifyStates, async (req, res, next) => {
  try {
    const merged = await getMergedState(req.code);

    if (!merged) {
      return send404(req, res);
    }

    return res.json({
      state: merged.state,
      nickname: merged.nickname,
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/states/:state/population', verifyStates, async (req, res, next) => {
  try {
    const merged = await getMergedState(req.code);

    if (!merged) {
      return send404(req, res);
    }

    return res.json({
      state: merged.state,
      population: merged.population,
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/states/:state/admission', verifyStates, async (req, res, next) => {
  try {
    const merged = await getMergedState(req.code);

    if (!merged) {
      return send404(req, res);
    }

    return res.json({
      state: merged.state,
      admitted: merged.admission_date,
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/states/:state/funfact', verifyStates, async (req, res, next) => {
  try {
    const { funfacts } = req.body;

    if (!Array.isArray(funfacts) || funfacts.length === 0) {
      return res.status(400).json({ error: 'The funfacts property is required and must be an array.' });
    }

    const cleanFunfacts = funfacts
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);

    if (!cleanFunfacts.length) {
      return res.status(400).json({ error: 'The funfacts array must contain at least one string.' });
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
    return res.status(201).json(doc);
  } catch (error) {
    return next(error);
  }
});

app.patch('/states/:state/funfact', verifyStates, async (req, res, next) => {
  try {
    const { index, funfact } = req.body;

    if (!index || !funfact) {
      return res.status(400).json({ error: 'Both index and funfact are required.' });
    }

    const parsedIndex = Number(index);
    if (!Number.isInteger(parsedIndex) || parsedIndex < 1) {
      return res.status(400).json({ error: 'Index must be a positive integer starting at 1.' });
    }

    const doc = await States.findOne({ stateCode: req.code });

    if (!doc || !Array.isArray(doc.funfacts) || doc.funfacts.length === 0) {
      return res.status(404).json({ error: `No Fun Facts found for ${req.code}` });
    }

    const zeroBasedIndex = parsedIndex - 1;

    if (zeroBasedIndex < 0 || zeroBasedIndex >= doc.funfacts.length) {
      return res.status(400).json({ error: 'Index is out of range.' });
    }

    doc.funfacts[zeroBasedIndex] = String(funfact).trim();
    await doc.save();

    return res.json(doc);
  } catch (error) {
    return next(error);
  }
});

app.delete('/states/:state/funfact', verifyStates, async (req, res, next) => {
  try {
    const { index } = req.body;

    if (!index) {
      return res.status(400).json({ error: 'The index property is required.' });
    }

    const parsedIndex = Number(index);
    if (!Number.isInteger(parsedIndex) || parsedIndex < 1) {
      return res.status(400).json({ error: 'Index must be a positive integer starting at 1.' });
    }

    const doc = await States.findOne({ stateCode: req.code });

    if (!doc || !Array.isArray(doc.funfacts) || doc.funfacts.length === 0) {
      return res.status(404).json({ error: `No Fun Facts found for ${req.code}` });
    }

    const zeroBasedIndex = parsedIndex - 1;

    if (zeroBasedIndex < 0 || zeroBasedIndex >= doc.funfacts.length) {
      return res.status(400).json({ error: 'Index is out of range.' });
    }

    doc.funfacts.splice(zeroBasedIndex, 1);
    await doc.save();

    return res.json(doc);
  } catch (error) {
    return next(error);
  }
});

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