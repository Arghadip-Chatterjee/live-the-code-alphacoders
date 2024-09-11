"use client";

import { useState } from "react";
import Link from "next/link";

export default function UploadPage() {
  const [resume, setResume] = useState<File | null>(null);
  const [role, setRole] = useState("");
  const [question, setQuestion] = useState(""); // Single question
  const [answer, setAnswer] = useState(""); // Single answer
  const [loading, setLoading] = useState(false);

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setResume(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!resume) {
      alert("Please upload a resume.");
      return;
    }

    if (!role.trim()) {
      alert("Please enter the role you are applying for.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("resume", resume);
    formData.append("role", role);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log(data);

      if (res.ok) {
        setQuestion(data.question || "No question received.");
      } else {
        alert(data.error || "Error generating question.");
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("An error occurred while processing your request.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (value: string) => {
    setAnswer(value);
  };

  const handleSaveAnswer = async () => {
    if (!answer.trim()) {
      alert("Please provide an answer before saving.");
      return;
    }

    const formData = new FormData();
    formData.append("question", question);
    formData.append("answer", answer);

    try {
      const res = await fetch("/api/submit-answer", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        // Fetch the next question
        const nextQuestionRes = await fetch("/api/get-next-question");
        const nextQuestionData = await nextQuestionRes.json();

        if (nextQuestionRes.ok) {
          setQuestion(nextQuestionData.question || "No more questions.");
          setAnswer(""); // Clear the answer field
        } else {
          alert(nextQuestionData.error || "Error fetching next question.");
        }
      } else {
        alert(data.error || "Error saving answer.");
      }
    } catch (error) {
      console.error("Save Answer error:", error);
      alert("An error occurred while saving your answer.");
    }
  };

  const handleClearDatabase = async () => {
    try {
      const res = await fetch("/api/clear-database", {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok) {
        alert("Database cleared successfully!");
        setQuestion(""); // Reset the question
        setAnswer(""); // Reset the answer
      } else {
        alert(data.error || "Failed to clear the database.");
      }
    } catch (error) {
      console.error("Clear Database error:", error);
      alert("An error occurred while clearing the database.");
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-6">AI Mock Interview Platform</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Upload Resume (PDF):</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleResumeUpload}
          className="border p-2 w-full"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Role:</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border p-2 w-full"
        >
          <option value="">-- Select Role --</option>
          <option value="Frontend Developer">Frontend Developer</option>
          <option value="Backend Developer">Backend Developer</option>
          <option value="Full Stack Developer">Full Stack Developer</option>
          <option value="Data Scientist">Data Scientist</option>
        </select>
      </div>

      <button
        onClick={handleSubmit}
        className={`bg-blue-500 text-white px-4 py-2 rounded ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={loading}
      >
        {loading ? "Processing..." : "Submit"}
      </button>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Interview Question</h2>
        {question && (
          <div className="mb-6">
            <p className="font-medium">{question}</p>
            <textarea
              value={answer}
              onChange={(e) => handleAnswerChange(e.target.value)}
              className="border p-2 w-full mt-2"
              placeholder="Type your answer here..."
              rows={4}
            ></textarea>
            <button
              onClick={handleSaveAnswer}
              className="mt-2 bg-green-500 text-white px-3 py-1 rounded"
            >
              Save Answer
            </button>
          </div>
        )}
      </div>

      {/* Clear Database Button */}
      <div className="mt-8">
        <button
          onClick={handleClearDatabase}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Clear Database
        </button>
      </div>

      <div className="mt-8">
        <Link href="/git">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Github
          </button>
        </Link>
      </div>

    </div>
  );
}
