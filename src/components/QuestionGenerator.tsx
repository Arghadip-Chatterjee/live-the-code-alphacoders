'use client';

import { useState} from 'react';
import { Octokit } from '@octokit/core';
import OpenAI from "openai";
import sdk from '@stackblitz/sdk';
// import useSound from 'use-sound';
import AudioPlayer from './AudioPlayer';
// import player from 'play-sound'; // Import the play-sound package

const octokit = new Octokit({
    auth: process.env.NEXT_PUBLIC_GITHUB_TOKEN,
});

const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
    organization: "org-ZmBadT0106lBb2s18ISgnNYL",
    project: "proj_Urz1iIoXSluSGwAmhiDXEUcJ",
});

// const audioPlayer = player();


export default function QuestionGenerator() {
    const [repoUrl, setRepoUrl] = useState('');
    const [questions, setQuestions] = useState<string[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [database, setDatabase] = useState<any>({ questions: [], answers: [], files: [] });
    // const [audioUrl, setAudioUrl] = useState<string | null>(null);
    // const [play, { stop, sound }] = useSound('/speech.mp3');
    const [checker, setChecker] = useState(0);
    const [audioKey, setAudioKey] = useState<number>(Date.now());



    const generateSpeech = async (text: string) => {
        try {
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            });

            const data = await response.json();

            if (response.ok && data.filePath) {

                console.log(data)

                setChecker((prev) => prev + 1);
                setAudioKey((prev) => prev + 1);
                console.log(checker);

            } else {
                console.error('Error generating speech:', data.error);
            }
        } catch (error) {
            console.error('Error generating speech:', error);
        }
    };

    // useEffect(() => {
    //     // Call generateSpeech only for the latest question upon database update
    //     const latestQuestion = questions[questions.length - 1];
    //     generateSpeech(latestQuestion);
    // }, [questions]);

    // Call this function when you want to play the speech in the browser
    // const playAudio = () => {
    //     if (audioUrl) {
    //         const audio = new Audio(audioUrl);
    //         audio.play();
    //     }
    // };

    const handleFetchAndGenerate = async () => {
        setLoading(true);
        setError('');  // Reset error state before new call

        const regex = /github\.com\/([^/]+)\/([^/]+)(?:\.git)?$/;
        const match = repoUrl.match(regex);

        if (match) {
            const owner = match[1];
            const repo = match[2];
            const username = match[1];
            const repository = match[2];

            try {
                // Fetch repository content, README, and languages concurrently
                const [repoContent, repoReadme, repoLanguages] = await Promise.all([
                    fetchRepoContent(owner, repo, ''),
                    fetchRepoReadme(owner, repo),
                    fetchRepoLanguages(owner, repo)
                ]);

                // Combine the fetched content into one payload
                const combinedContent = {
                    repoContent,
                    repoReadme,
                    repoLanguages
                };

                // Send the combined data to OpenAI to generate questions
                const openaiResponse = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are a helpful assistant and a Expert Interviewer interviewing a candidate for a Software Role based on their GitHub project.' },
                        { role: 'user', content: `You are an Expert Interviewer and Based on this GitHub repository, generate an interview question:\n\n${JSON.stringify(combinedContent)}` }
                    ],
                });

                const generatedQuestions = openaiResponse.choices.map((choice: any) => choice.message.content);

                // Embed the GitHub project using StackBlitz SDK
                sdk.embedGithubProject('embed', `${username}/${repository}`, {
                    terminalHeight: 45,
                });

                // Save content, questions, and initialize answers in the database
                const updatedDatabase = {
                    files: repoContent,
                    readme: repoReadme,
                    languages: repoLanguages,
                    questions: generatedQuestions,
                    answers: [],
                };

                setDatabase(updatedDatabase);
                setQuestions(generatedQuestions);
                console.log(database);
                localStorage.setItem('database', JSON.stringify(updatedDatabase)); // Simulate storing in `database.json`
                setError('');

                // Call generateSpeech after setting the questions
                if (generatedQuestions.length > 0) {
                    generateSpeech(generatedQuestions[0]);

                }

            } catch (err) {
                console.error(err);
                setError('Failed to fetch repository information or generate questions');
            }
        } else {
            setError('Invalid GitHub repository URL');
        }

        setLoading(false);
    };


    // Recursive function to fetch directory contents
    const fetchRepoContent = async (owner: string, repo: string, path: string): Promise<any[]> => {
        const programmableFileExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.html', '.css', '.java', '.cpp', '.c']; // Add other file types you want to include
        const excludedDirectories = ['components', 'node_modules', '.next', '.react', '__pycache__', '_py_cache__', 'nodemodules', 'prisma', 'sanity', 'ui', 'public'];
        const excludedFiles = ['README.md', 'package.json', 'package-lock.json'];

        try {
            const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
                owner,
                repo,
                path,
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28',
                },
            });

            const result = [];
            const items = Array.isArray(response.data) ? response.data : [response.data];

            for (const item of items) {
                // Skip excluded directories
                if (item.type === 'dir' && !(excludedDirectories.includes(item.name))) {
                    console.log(`Skipping excluded directory: ${item.path} \ ${item.name}`);
                    // continue; // Skip this iteration and do not process this directory
                    // Recursively fetch subdirectory content
                    const subDirContent = await fetchRepoContent(owner, repo, item.path);
                    console.log(`Including Directories: ${item.path}`)
                    result.push({ name: item.name, path: item.path, type: 'dir', content: subDirContent });

                } else {
                    if (item.type === 'file' && item.download_url && !(excludedFiles.includes(item.name))) {
                        const extension = item.name.slice(item.name.lastIndexOf('.'));
                        if (programmableFileExtensions.includes(extension)) {
                            try {
                                const fileContentResponse = await fetch(item.download_url);
                                const fileContent = await fileContentResponse.text();
                                console.log(`Including Files : ${item.path}`)
                                result.push({ name: item.name, path: item.path, type: 'file', content: fileContent });
                            } catch (error) {
                                console.error(`Error fetching file content from ${item.download_url}:`, error);
                            }
                        }
                    }
                }
            }

            return result;
        } catch (error) {
            console.error('Error fetching repo content:', error);
            throw new Error('Failed to fetch repository content');
        }
    };


    const fetchRepoReadme = async (owner: string, repo: string) => {
        try {
            const response = await octokit.request('GET /repos/{owner}/{repo}/readme', {
                owner,
                repo,
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28',
                },
            });

            return atob(response.data.content);
        } catch (error) {
            console.error('Error fetching README:', error);
            throw new Error('Failed to fetch README');
        }
    };

    const fetchRepoLanguages = async (owner: string, repo: string) => {
        try {
            const response = await octokit.request('GET /repos/{owner}/{repo}/languages', {
                owner,
                repo,
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching languages:', error);
            throw new Error('Failed to fetch languages');
        }
    };

    const handleNextQuestion = async () => {
        // Add user answer to database and update UI
        const updatedDatabase = { ...database };
        updatedDatabase.answers.push({
            question: questions[currentQuestionIndex],
            answer: userAnswer,
        });

        setDatabase(updatedDatabase);
        localStorage.setItem('database', JSON.stringify(updatedDatabase));

        // Prepare for the next question
        setUserAnswer('');
        setCurrentQuestionIndex((prevIndex) => {
            // const nextIndex = prevIndex + 1;
            const newIndex = prevIndex + 1;
            // If we have reached the end of the questions
            console.log(`New Index: ${newIndex}`); // Log the new index
            // return prevIndex; // Prevent out-of-bounds error

            // return nextIndex;
            return newIndex;
        });

        try {
            // Fetch the next follow-up question from OpenAI
            const openaiResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant who is a EXpert Interviewer interviewing a candidate for a Software Role based on their GitHub project.' },
                    { role: 'user', content: `You are an Expert Interviewer. Here are the user previous answers: ${JSON.stringify(updatedDatabase.answers)}. Generate a follow-up question based on their responses.` }
                ],
            });

            const generatedQuestion = openaiResponse.choices[0]?.message.content ?? null;

            if (generatedQuestion) {
                // Add new question to the database and UI
                const newDatabase = { ...updatedDatabase };
                newDatabase.questions.push(generatedQuestion);

                setDatabase(newDatabase);
                setQuestions((prevQuestions) => {
                    console.log('Previous questions:', prevQuestions);
                    const updatedQuestions = [...prevQuestions, generatedQuestion];
                    console.log('Updated questions:', updatedQuestions);
                    return [...prevQuestions, generatedQuestion];
                });
                // generateSpeech(questions[questions.length - 1])
                localStorage.setItem('database', JSON.stringify(newDatabase));
                // if (questions.length > 0 && questions[questions.length - 1]) {
                //     generateSpeech(questions[questions.length - 1]);
                // } else {
                //     console.error("No valid question found to convert to speech.");
                // }

                generateSpeech(generatedQuestion);

            } else {
                throw new Error('Generated question is null');
            }

            setError('');
        } catch (err) {
            console.error(err);
            setError('Failed to generate the next question');
        }
    };

    const handleClearDatabase = () => {
        setDatabase({ questions: [], answers: [], files: [] });
        setQuestions([]);
        setCurrentQuestionIndex(0);
        setUserAnswer('');
        localStorage.removeItem('database');
    };





    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Generate Questions from GitHub Repository</h1>

            <div className="mb-4">
                <label htmlFor="repoUrl" className="block text-sm font-medium text-gray-700">
                    GitHub Repository URL:
                </label>
                <input
                    type="text"
                    id="repoUrl"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                    placeholder="https://github.com/username/repository-name"
                />
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <button
                onClick={handleFetchAndGenerate}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                disabled={loading}
            >
                {loading ? 'Generating...' : 'Generate Questions'}
            </button>

            <div id="embed" className="mt-6 h-[500px] border rounded-md"></div>

            {questions.length > 0 && (
                <div className="mt-6">
                    {/* <p className="mb-4">{questions[currentQuestionIndex]}</p> */}
                    <p key={questions.length - 1} className="mb-4">{questions[questions.length - 1]}</p>

                    <textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                        rows={4}
                        placeholder="Enter your answer here..."
                    />

                    <button
                        onClick={handleNextQuestion}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mt-4"
                        disabled={!userAnswer}
                    >
                        Next Question
                    </button>

                    <button
                        onClick={handleClearDatabase}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mt-6"
                    >
                        Clear Database
                    </button>
                </div>
            )}

            {checker && (
                <AudioPlayer src={`/speech${checker}.mp3`} key={audioKey} />
            )}


        </div>
    );
}
