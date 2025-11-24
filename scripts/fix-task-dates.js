/**
 * Simple migration script to fix task dates
 * Run with: node scripts/fix-task-dates.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Define Task schema inline
const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  status: String,
  user: mongoose.Schema.Types.ObjectId,
  category: mongoose.Schema.Types.ObjectId,
  dueDate: Date,
  taskDate: Date,
  createdAt: Date,
  updatedAt: Date,
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);

async function fixTaskDates() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all tasks without taskDate
    const tasksWithoutDate = await Task.find({ taskDate: { $exists: false } });
    console.log(`📊 Found ${tasksWithoutDate.length} tasks without taskDate`);

    if (tasksWithoutDate.length === 0) {
      console.log('✅ All tasks already have taskDate!');
      await mongoose.disconnect();
      return;
    }

    console.log('\n📝 Sample tasks that will be updated:');
    tasksWithoutDate.slice(0, 5).forEach(task => {
      const createdDate = task.createdAt ? task.createdAt.toISOString().split('T')[0] : 'unknown';
      console.log(`  - "${task.title}" (created: ${createdDate})`);
    });

    console.log('\n⚠️  This will set taskDate = createdAt date for all tasks without taskDate');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🚀 Starting migration...\n');

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
        
        if (updated % 10 === 0) {
          console.log(`⏳ Processed ${updated}/${tasksWithoutDate.length} tasks...`);
        }
      } catch (error) {
        console.error(`❌ Failed to update task ${task._id}:`, error.message);
        failed++;
      }
    }

    console.log('\n📈 Migration Complete!');
    console.log(`✅ Successfully updated: ${updated} tasks`);
    if (failed > 0) {
      console.log(`❌ Failed to update: ${failed} tasks`);
    }
    console.log('\n💡 Tip: Refresh your browser to see the updated statistics\n');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
fixTaskDates();
