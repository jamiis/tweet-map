###*
Error responses
###
"use strict"
module.exports[404] = pageNotFound = (req, res) ->
  viewFilePath = "404"
  statusCode = 404
  result = status: statusCode
  res.status result.status
  res.render viewFilePath, (err) ->
    return res.status(result.status).json(result)  if err
    res.render viewFilePath
    return

  return
