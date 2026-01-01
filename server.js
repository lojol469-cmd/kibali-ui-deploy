import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// --- CONNEXION MONGODB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connecté'))
  .catch(err => console.error('❌ Erreur DB:', err));

// --- CONFIGURATION NODEMAILER (CORRIGÉE) ---
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Utilisation du port SSL 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // Aide à passer outre certains blocages réseau
  }
});

// Vérification immédiate
transporter.verify((error) => {
  if (error) {
    console.error('❌ Erreur SMTP Persistante:', error.message);
  } else {
    console.log('📧 Serveur SMTP authentifié avec succès !');
  }
});

const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  otp: String,
  otpExpires: Date
}));

// --- ROUTE REGISTER ---
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    let user = await User.findOne({ email });
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({ email, password: hashedPassword, otp, otpExpires: Date.now() + 600000 });
    } else {
      user.otp = otp;
      user.otpExpires = Date.now() + 600000;
    }
    await user.save();

    await transporter.sendMail({
      from: `"Kibali AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Code de vérification : ${otp}`,
      html: `<div style="text-align:center; padding:20px; border:2px solid #10b981;">
              <h1>Votre code Kibali</h1>
              <p style="font-size:30px; font-weight:bold;">${otp}</p>
             </div>`
    });

    res.json({ message: "OTP envoyé" });
  } catch (err) {
    console.error("Erreur lors du register:", err);
    res.status(500).json({ error: "Erreur serveur ou SMTP" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Serveur actif sur le port ${PORT}`));