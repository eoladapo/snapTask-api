/**
 * Migration script to add taskDate to existing tasks
 * This script sets taskDate based on the createdAt timestamp for tasks that don't have it
 */

import mongoose from 'mongoose';
import { Task } from '../src/models/task.model';
import config from '../src/config';

const migrateTaskDates = async () => {
  try {
    console.log('🔄 Starting task date migration...');
    
    // Connect to MongoDB
    if (!config.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all tasks without taskDate
    const tasksWithoutDate = await Task.find({ taskDate: { $exists: false } });
    console.log(`📊 Found ${tasksWithoutDate.length} tasks without taskDate`);

    if (tasksWithoutDate.length === 0) {
      console.log('✅ No tasks to migrate');
      await mongoose.disconnect();
      return;
    }

    // Update each task
    let updated = 0;
    let failed = 0;

    for (const task of tasksWithoutDate) {
      try {
        // Set taskDate to the date portion of createdAt
        const createdAt = task.createdAt || new Date();
        const taskDate = new Date(
          createdAt.getFullYear(),
          createdAt.getMonth(),
          createdAt.getDate()
        );

        await Task.findByIdAndUpdate(task._id, { taskDate });
        updated++;
        
        if (updated % 100 === 0) {
          console.log(`⏳ Processed ${updated} tasks...`);
        }
      } catch (error) {
        console.error(`❌ Failed to update task ${task._id}:`, error);
        failed++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successfully updated: ${updated} tasks`);
    if (failed > 0) {
      console.log(`❌ Failed to update: ${failed} tasks`);
    }
    console.log('✅ Migration completed!');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
migrateTaskDates();
