import mongoose from 'mongoose';
import { env } from '../config/environment.js';
import { SubjectModel } from '../models/Subject.js';
import { UserModel } from '../models/User.js';

const run = async () => {
  try {
    await mongoose.connect(env.mongodbUri);
    console.log('MongoDB Connected!');

    const teachers = await UserModel.find({ role: 'teacher' }).lean();
    console.log('Teachers in DB:', teachers.map(t => ({ id: t._id, username: t.username })));

    const subjects = await SubjectModel.find({}).lean();
    console.log('Subjects in DB:', subjects.map(s => ({ id: s._id, name: s.name, teacherId: s.teacherId })));

    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
};

void run();
