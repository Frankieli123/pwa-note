import { pgTable, serial, text, timestamp, varchar, integer } from "drizzle-orm/pg-core"

// Notes table
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Links table
export const links = pgTable("links", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Files table - 只支持 Vercel Blob 存储
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  blobUrl: text("blob_url").notNull(), // Vercel Blob 存储的文件URL（必需）
  thumbnailUrl: text("thumbnail_url"), // Vercel Blob 存储的缩略图URL
  size: integer("size").notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
})
