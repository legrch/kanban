import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const cards = sqliteTable('cards', {
  id: text('id').primaryKey(), data: text('data').notNull(),
  version: integer('version').notNull().default(1), updatedAt: text('updated_at').notNull(),
});
export const cardActivity = sqliteTable('card_activity', {
  id: text('id').primaryKey(), cardId: text('card_id').notNull(),
  version: integer('version').notNull(), data: text('data').notNull(), createdAt: text('created_at').notNull(),
});
export const taskNumbers = sqliteTable('task_numbers', {
  number: integer('number').primaryKey({ autoIncrement: true }),
  cardId: text('card_id').notNull().unique(),
});
export const projectCounters=sqliteTable('project_counters',{
 prefix:text('prefix').primaryKey(),lastNumber:integer('last_number').notNull(),
});
export const projectTaskNumbers=sqliteTable('project_task_numbers',{
 cardId:text('card_id').primaryKey(),prefix:text('prefix').notNull(),number:integer('number').notNull(),
},table=>[uniqueIndex('project_task_number_unique').on(table.prefix,table.number)]);
