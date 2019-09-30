const express = require('express');
const app = express();
var bcrypt = require('bcrypt');
var cookieSession = require('cookie-session')
app.use(cookieSession({
  secret: "hola",
  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

var mongoose = require("mongoose");


mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/login', { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on("error", function(e) { console.error(e); });

// definimos el schema
var schema = mongoose.Schema({
  name: { type: String, default: "Anónimo" },
  email: { type: String, default: 1  },
  password: { type: String, default: 1  },
});


schema.statics.authenticate = async (email, password) => {
  // buscamos el usuario utilizando el email
  const user = await mongoose.model("Registro").findOne({ email: email });
  if (user) {
    // si existe comparamos la contraseña
    const match = await bcrypt.compare(password, user.password);
    return match ? user : null;
  }
  return null;
};

var Registro = mongoose.model("Registro", schema);

//Se crea el formulario de registro
app.get('/register', (req, res) => {
  res.send('<form action="/register" method="post">Name<br><label for="name"><input type="text" id="name" name="name"><br>Email<br><input type="text" name="email" id="email"><br>Contraseña<br><input type="password" id="password" name="password"><br> <button type="submit">Registrarse</button></form>');
});

app.use(express.urlencoded());
//Guarda nombre y usuario en la base de datos y encripta la contraseña
app.post('/register', async(req, res) => {

  var  pass = await bcrypt.hash(req.body.password, 10);
  var first =  await new Registro({name: req.body.name, email:req.body.email, password: pass});
  first.save(function(err) {
    if (err) return console.error(err);
  });
  res.redirect('/login');
});

// se muestra el formulario para ingresar
app.get('/login', async (req, res) => {
  res.send('<form action="/login" method="post">Email<br><input type="text" name="email" id="email"><br>Contraseña<br><input type="password" id="password" name="password"><br><a href="/register">Registrarse</a> <button type="submit">Ingresar</button></form>');
});

//Se valida si el usuario esta registrado
app.post('/login', async (req, res) => {
  try {
    const user = await Registro.authenticate(req.body.email, req.body.password);
    if (user) {
      req.session.userId = user._id; // acá guardamos el id en la sesión
      return res.redirect("/");
    } else {
      return res.redirect("/login");
    }
  } catch (e) {
    console.log(e)
  };
});
app.get('/', (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  Registro.find({}, function(err, registro) {
    if (err) return console.error(err);
    var datosTabla = registro;


    var $html = "<a href='/logout'>Salir</a><table><thead><tr><th>Name</th><th>Email</th></tr></thead><tbody>"
    for (var i = 0; i < datosTabla.length; i++){
      $html += '<tr><td>'+datosTabla[i].name+'</td><td>'+datosTabla[i].email+'</td></tr>';
    }
    $html += "</tbody></table>";
    res.send($html);
  });
});

app.get('/logout', (req, res) => {
  req.session.userId = null;
  return res.redirect("/login");
});

app.listen(3000, () => console.log('Listening on port 3000!'));
