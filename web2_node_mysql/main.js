var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var template = require('./lib/template.js');
var path = require('path');
var sanitizeHtml = require('sanitize-html');
var mysql = require('mysql');
var db = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '1234',
  database : 'opentutorials',
  insecureAuth : true
});
db.connect();

var app = http.createServer(function(request,response){
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    var pathname  = url.parse(_url, true).pathname;

    if(pathname === '/'){
      if(queryData.id === undefined){
        db.query(`SELECT * FROM topic`, function(error, topics){
          if(error) throw error;
          var title = 'Welcome';
          var description = 'Hello, Node.js';
          var list = template.list(topics);
          var html = template.html(title, list,
                `<h2>${title}</h2><p>${description}</p>`,
                `<a href='/create'>create</a>`);

          response.writeHead(200);
          response.end(html);
        });
      } else{
        db.query(`SELECT * FROM topic`, function(error, topics){
          if(error) throw error;
          db.query(`SELECT * FROM topic LEFT JOIN author 
                ON topic.author_id = author.id
                WHERE topic.id = ?`, [queryData.id], function(errorid, topic){
            if(errorid) throw errorid;

            var title = topic[0].title;
            var description = topic[0].description;
            var sanitizedTitle = sanitizeHtml(title);
            var sanitizedDescription = sanitizeHtml(description);
            var author = topic[0].name;
            var list = template.list(topics);
            var html = template.html(title, list,
              `<h2>${sanitizedTitle}</h2>
              <p>${sanitizedDescription}</p>
              <p>by ${author}</p>`,
              `<a href='/create'>create</a>
              <a href='/update?id=${queryData.id}'>update</a>
              <form action="delete_process" method="post">
                <input type="hidden" name="id" value="${queryData.id}">
                <input type="submit" value="delete">
              </form>`);
            response.writeHead(200);
            response.end(html);
          });
        });
      }
    }
    else if(pathname === '/create'){
      db.query(`SELECT * FROM topic`, function(error, topics){
        if(error) throw error;
        db.query(`SELECT * FROM author`, function(error1, authors){
          if(error1) throw error1;

          var tag = template.authorSelect(authors);
          var list = template.list(topics);
          var title = 'Create';
          var html = template.html(title, list,
            `<form action="/create_process" method="post">
              <p><input type="text" name="title" placeholder="title"></p>
              <p>
                <textarea name="description" placeholder="description"></textarea>
              </p>
              <p>
                ${tag}
              </p>
              <p>
                <input type="submit">
              </p>
            </form>`, '');
          response.writeHead(200);
          response.end(html);
        });
      })
    }
    else if(pathname === '/create_process'){
      var body = '';
      request.on('data', function(data){
        body += data;
      });
      request.on('end', function(){
        var post = qs.parse(body);
        db.query(`
          INSERT INTO topic 
          (title, description, created, author_id)
          VALUES(?, ?, NOW(), ?)`,
            [post.title, post.description, post.author], function(error, result){
          if(error) throw error;
          response.writeHead(302,
            {Location:`/?id=${result.insertId}`});
          response.end();
        });
      });
    }
    else if(pathname === '/update'){
      db.query(`SELECT * FROM topic`, function(error, topics){
        if(error) throw error;
        db.query(`SELECT * FROM topic WHERE id = ?`, [queryData.id], function(error2, topic){
          if(error2) throw error2;
          db.query(`SELECT * FROM author`, function(error3, authors){
            if(error3) throw error3;
            var select = template.authorSelect(authors, topic[0].author_id);
            var list = template.list(topics);
            var title = topic[0].title;
            var description = topic[0].description;
            var html = template.html(title, list, `
              <form action="/update_process" method="post">
                <input type="hidden" name="id" value="${queryData.id}">
                <p><input type="text" name="title" placeholder="title" value="${title}"></p>
                <p>
                  <textarea name="description" placeholder="description">${description}</textarea>
                </p>

                <p>
                  ${select}
                </p>

                <p>
                  <input type="submit">
                </p>
              </form>`,
              `<a href='/create'>create</a> <a href='/update?id=${queryData.id}'>update</a>`);
            response.writeHead(200);
            response.end(html);
          });
        });
      });
    }
    else if(pathname === '/update_process'){
      var body = '';
      request.on('data', function(data){
        body += data;
      });
      request.on('end', function(){
        var post = qs.parse(body);
        db.query(`
          UPDATE topic 
          SET title = ?, description = ?, created = NOW(), author_id = ?
          WHERE id = ?`,
            [post.title, post.description, post.author, post.id], function(error, result){
          if(error) throw error;
          response.writeHead(302, {Location:`/`});
          response.end();
        });
      });
    }
    else if(pathname === '/delete_process'){
      var body = '';
      request.on('data', function(data){
        body += data;
      });
      request.on('end', function(){
        var post = qs.parse(body);
        db.query(`
          DELETE FROM topic WHERE id = ?`,
            [post.id], function(error, result){
          if(error) throw error;
          response.writeHead(302, {Location:`/`});
          response.end();
        });
      });
    }
    else {
      response.writeHead(404);
      response.end("404 Not Found");
    }
});
app.listen(3000);
