import express from 'express';
import { body, validationResult } from 'express-validator';
import Service from '../models/Service.js';
import Notification from '../models/Notification.js';
import { authenticateToken, requireAdmin, requireRole } from '../middleware/auth.js';
import { getIO } from '../utils/socket.js';
import User from '../models/User.js';
import Truck from '../models/Truck.js';
import Branch from '../models/Branch.js';

const router = express.Router();
