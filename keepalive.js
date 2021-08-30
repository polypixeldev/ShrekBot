const Express = require('express');

const app = Express()

module.exports = () => {
  app.use((req, res) => {
    res.send("OH HELLO THERE")
  })
  
  app.listen(() => {
    console.log('Server started')
  })
}