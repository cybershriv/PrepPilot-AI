const pdfParse = require("pdf-parse")
const { generateInterviewReport, generateResumePdf, interviewReportSchema } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")




/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {

    const jobDescription = typeof req.body.jobDescription === "string" ? req.body.jobDescription.trim() : ""
    const selfDescription = typeof req.body.selfDescription === "string" ? req.body.selfDescription.trim() : ""

    if (!jobDescription) {
        return res.status(400).json({ message: "Job description is required." })
    }

    if (!req.file && !selfDescription) {
        return res.status(400).json({ message: "Upload a PDF resume or provide a self-description." })
    }

    let resume = ""
    if (req.file) {
        const isPdf = req.file.buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"))
        if (!isPdf) {
            return res.status(400).json({ message: "Resume must be a valid PDF file." })
        }

        // pdf-parse v2 expects PDF bytes inside its `data` option; raw bytes were not parsed correctly.
        const parser = new pdfParse.PDFParse({ data: req.file.buffer })
        let resumeContent
        try {
            resumeContent = await parser.getText()
        } finally {
            await parser.destroy()
        }
        resume = typeof resumeContent.text === "string" ? resumeContent.text.trim() : ""

        if (!resume) {
            return res.status(400).json({ message: "No text could be extracted from the PDF. Use a text-based PDF or enter a self-description." })
        }
    }

    // Validate the PDF and extracted text; previously this assumed req.file always existed.
    const generatedReport = await generateInterviewReport({
        resume,
        selfDescription,
        jobDescription
    })

    // Prevent incomplete AI output from being saved as a blank-looking report.
    const validation = interviewReportSchema.safeParse(generatedReport)
    if (!validation.success) {
        console.error("AI returned an incomplete interview report:", validation.error.issues.map(({ path, message }) => ({ path, message })))
        return res.status(502).json({ message: "AI returned an incomplete report. Please try again." })
    }

    const interViewReportByAi = validation.data
    const interviewReport = await interviewReportModel.create({
        user: req.user.id,
        resume,
        selfDescription,
        jobDescription,
        ...interViewReportByAi,
        // Avoid a Mongoose validation failure if Gemini omits the optional title.
        title: typeof interViewReportByAi.title === "string" && interViewReportByAi.title.trim()
            ? interViewReportByAi.title.trim()
            : "Interview Plan"
    })

    res.status(201).json({
        message: "Interview report generated successfully.",
        interviewReport
    })

}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {

    const { interviewId } = req.params

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    res.status(200).json({
        message: "Interview report fetched successfully.",
        interviewReport
    })
}


/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}


/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params

    const interviewReport = await interviewReportModel.findById(interviewReportId)

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const { resume, jobDescription, selfDescription } = interviewReport

    const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
    })

    res.send(pdfBuffer)
}

module.exports = { generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController }