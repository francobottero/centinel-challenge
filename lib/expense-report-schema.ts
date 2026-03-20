import { z } from "zod";

export const expenseExtractionSchema = z.object({
  invoiceNumber: z
    .string()
    .nullable()
    .describe("Invoice number exactly as shown on the document, or null."),
  description: z
    .string()
    .nullable()
    .describe("Short human-readable summary of the expense, or null."),
  amount: z
    .string()
    .nullable()
    .describe(
      "Total amount as a decimal string like 123.45 without currency symbols, or null.",
    ),
  category: z
    .string()
    .nullable()
    .describe("Best-fit expense category such as Travel, Meals, Software, or null."),
  expenseDate: z
    .string()
    .nullable()
    .describe("Expense date in ISO format YYYY-MM-DD, or null."),
  vendorName: z
    .string()
    .nullable()
    .describe("Vendor or merchant name from the document, or null."),
  additionalNotes: z
    .string()
    .nullable()
    .describe("Any useful extracted notes or ambiguity worth flagging, or null."),
});

export type ExtractedExpenseReport = z.infer<typeof expenseExtractionSchema>;

export const batchExpenseExtractionSchema = z.array(
  expenseExtractionSchema.extend({
    documentIndex: z
      .number()
      .int()
      .nonnegative()
      .describe("Zero-based index of the uploaded document in the input order."),
    sourceFileName: z
      .string()
      .describe("Original uploaded file name for the matching document."),
  }),
);

export type BatchExtractedExpenseReport = z.infer<
  typeof batchExpenseExtractionSchema
>[number];
