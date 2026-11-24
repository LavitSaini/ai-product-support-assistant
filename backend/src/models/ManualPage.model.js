import { Schema, model } from "mongoose";

const tableColumnSchema = new Schema(
  {
    columnNumber: {
      type: Number,
      required: true,
    },
    centerX: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const tableRowSchema = new Schema(
  {
    y: {
      type: Number,
      required: true,
    },
    cells: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
);

const extractedTableSchema = new Schema(
  {
    columnCount: {
      type: Number,
      required: true,
    },
    columns: {
      type: [tableColumnSchema],
      default: [],
    },
    rows: {
      type: [tableRowSchema],
      default: [],
    },
    extractionMethod: {
      type: String,
      default: "coordinate-based",
    },
  },
  { _id: false },
);

const layoutItemSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
    },
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    width: {
      type: Number,
      default: 0,
    },
    height: {
      type: Number,
      default: 0,
    },
    fontName: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

const manualPageSchema = new Schema(
  {
    manualId: {
      type: Schema.Types.ObjectId,
      ref: "Manual",
      required: true,
      index: true,
    },

    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    pageNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    content: {
      type: String,
      default: "",
      trim: true,
    },

    tables: {
      type: [extractedTableSchema],
      default: [],
    },

    // Original text positions extracted from the PDF
    layoutItems: {
      type: [layoutItemSchema],
      default: [],
    },

    // Original PDF page dimensions
    pageWidth: {
      type: Number,
      default: 0,
    },

    pageHeight: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Each page number must be unique within a manual.
manualPageSchema.index({ manualId: 1, pageNumber: 1 }, { unique: true });

const ManualPage = model("ManualPage", manualPageSchema);

export default ManualPage;
