import { useState } from "react";
import { loader } from "../assets";
import { useLazyGetSummaryQuery } from "../services/article";

const Demo = () => {
  const [transcript, setTranscript] = useState("");
  const [prompt, setPrompt] = useState("");
  const [summary, setSummary] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const [getSummary, { error, isFetching }] = useLazyGetSummaryQuery();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transcript.trim()) return;

    try {
      const { data } = await getSummary({ transcript, prompt });
      if (data?.summary) {
        setSummary(data.summary);
        setIsEditing(true);
        setShowEmailForm(false);
      }
    } catch (err) {
      console.error("Summary fetch failed:", err);
    }
  };

  const handleDoneEditing = () => {
    setIsEditing(false);
    setShowEmailForm(true);
  };

  // ✅ Send email using mailto:
  const handleSendEmail = () => {
    if (!summary) {
      alert("Please generate the summary first.");
      return;
    }
    if (!email || !subject) {
      alert("Please enter recipient email and subject.");
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(summary)}`;

    window.location.href = mailtoLink;
  };

  return (
    <section className="mt-16 w-full max-w-2xl">
      {/* Transcript + Prompt Form */}
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div>
          <label className="font-bold block mb-2">
            Upload or Paste Transcript:
          </label>
          <textarea
            placeholder="Paste your meeting notes or transcript here..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full p-3 border rounded-md min-h-[120px] focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        <div>
          <label className="font-bold block mb-2">Custom Instruction / Prompt:</label>
          <textarea
            placeholder="E.g., 'Summarize in bullet points' or 'Highlight action items'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-3 border rounded-md min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-md transition"
        >
          Generate Summary
        </button>
      </form>

      {/* Display Result */}
      <div className="my-10 w-full flex flex-col gap-4">
        {isFetching ? (
          <div className="flex justify-center items-center">
            <img src={loader} alt="loader" className="w-20 h-20 object-contain" />
          </div>
        ) : error ? (
          <p className="text-red-600 font-bold">
            Error: {error?.data?.error || "Failed to fetch summary"}
          </p>
        ) : (
          summary && (
            <div className="flex flex-col gap-3 w-full">
              <h2 className="text-xl font-bold">Generated Summary</h2>

              {isEditing ? (
                <>
                  <textarea
                    className="w-full p-3 border rounded-md min-h-[200px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                  />
                  <button
                    type="button"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md w-fit transition"
                    onClick={handleDoneEditing}
                  >
                    Done Editing
                  </button>
                </>
              ) : (
                <p className="p-3 border rounded bg-gray-100 whitespace-pre-line">
                  {summary}
                </p>
              )}

              {/* Email Form */}
              {showEmailForm && (
                <div className="mt-4 flex flex-col gap-2 border-t pt-4">
                  <h3 className="font-semibold">Send Summary via Email</h3>

                  <input
                    type="email"
                    placeholder="Recipient email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <input
                    type="text"
                    placeholder="Email Subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <button
                    type="button"
                    onClick={handleSendEmail}
                    className={`px-4 py-2 rounded text-white ${
                      summary
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                    disabled={!summary}
                  >
                    Send Email
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </section>
  );
};

export default Demo;
