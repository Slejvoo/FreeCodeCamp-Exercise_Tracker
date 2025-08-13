const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// --- Mongoose setup ---
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })

const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
})
const User = mongoose.model('User', userSchema)

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
})
const Exercise = mongoose.model('Exercise', exerciseSchema)

// --- API Endpoints ---

// Create user
app.post('/api/users', async (req, res) => {
  try {
    const user = new User({ username: req.body.username })
    await user.save()
    res.json({ username: user.username, _id: user._id })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Get all users
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, '_id username')
  res.json(users)
})

// Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const user = await User.findById(req.params._id)
    if (!user) return res.status(400).json({ error: 'User not found' })

    const { description, duration, date } = req.body
    const exercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    })
    await exercise.save()

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Get user log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id)
    if (!user) return res.status(400).json({ error: 'User not found' })

    let { from, to, limit } = req.query
    let filter = { userId: user._id }
    if (from || to) filter.date = {}
    if (from) filter.date.$gte = new Date(from)
    if (to) filter.date.$lte = new Date(to)

    let query = Exercise.find(filter).select('description duration date -_id')
    if (limit) query = query.limit(parseInt(limit))
    const log = await query.exec()

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log: log.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString()
      }))
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})