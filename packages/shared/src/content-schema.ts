import { z } from "zod";

export const contentStatusSchema = z.enum([
  "draft",
  "published",
  "needs_review",
]);
export type ContentStatus = z.infer<typeof contentStatusSchema>;

export const profileSchema = z.object({
  fullName: z.string().min(1).max(200),
  headline: z.string().max(300).optional().default(""),
  summary: z.string().max(5000).optional().default(""),
  email: z.string().email().optional().or(z.literal("")),
  location: z.string().max(200).optional().default(""),
  websiteUrl: z.string().url().optional().or(z.literal("")),
});
export type Profile = z.infer<typeof profileSchema>;

export const linkSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(100),
  url: z.string().url(),
  sortOrder: z.number().int().default(0),
});
export type Link = z.infer<typeof linkSchema>;

export const projectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(""),
  url: z.string().url().optional().or(z.literal("")),
  language: z.string().max(100).optional().default(""),
  topics: z.array(z.string()).default([]),
  stars: z.number().int().nonnegative().optional().default(0),
  githubRepoId: z.string().optional().nullable(),
  githubFullName: z.string().optional().nullable(),
  status: contentStatusSchema.default("draft"),
  sortOrder: z.number().int().default(0),
});
export type Project = z.infer<typeof projectSchema>;

export const experienceSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  location: z.string().max(200).optional().default(""),
  startDate: z.string().max(40).optional().default(""),
  endDate: z.string().max(40).optional().nullable(),
  summary: z.string().max(5000).optional().default(""),
  status: contentStatusSchema.default("draft"),
  sortOrder: z.number().int().default(0),
});
export type Experience = z.infer<typeof experienceSchema>;

export const educationSchema = z.object({
  id: z.string().optional(),
  school: z.string().min(1).max(200),
  degree: z.string().max(200).optional().default(""),
  field: z.string().max(200).optional().default(""),
  startDate: z.string().max(40).optional().default(""),
  endDate: z.string().max(40).optional().nullable(),
  summary: z.string().max(5000).optional().default(""),
  status: contentStatusSchema.default("draft"),
  sortOrder: z.number().int().default(0),
});
export type Education = z.infer<typeof educationSchema>;

export const skillSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  category: z.string().max(100).optional().default(""),
  proficiency: z.string().max(50).optional().default(""),
  sortOrder: z.number().int().default(0),
});
export type Skill = z.infer<typeof skillSchema>;

export const portfolioContentSchema = z.object({
  profile: profileSchema.partial().optional(),
  links: z.array(linkSchema).default([]),
  projects: z.array(projectSchema).default([]),
  experience: z.array(experienceSchema).default([]),
  education: z.array(educationSchema).default([]),
  skills: z.array(skillSchema).default([]),
});
export type PortfolioContent = z.infer<typeof portfolioContentSchema>;

export const publishedPortfolioSchema = z.object({
  profile: profileSchema.partial().nullable(),
  links: z.array(linkSchema),
  projects: z.array(projectSchema),
  experience: z.array(experienceSchema),
  education: z.array(educationSchema),
  skills: z.array(skillSchema),
});
export type PublishedPortfolio = z.infer<typeof publishedPortfolioSchema>;
