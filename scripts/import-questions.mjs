import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  'https://jjgqwtdinkspunfebeye.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqZ3F3dGRpbmtzcHVuZmViZXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUxMzkwMiwiZXhwIjoyMDkyMDg5OTAyfQ.db4fhhnBYjNUcqw7labAPprKAuEUCWGCCPsYbADetiE'
)

const genAI = new GoogleGenerativeAI('AIzaSyDhvGc1NMSa5pMutCVBvDen0D_8La7Xda4')
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

async function estimatePScore(question, options, correct, topic) {
  try {
    const prompt = `You are an educational assessment expert. Estimate the difficulty of the following quiz question for university students who have studied the topic.

Topic: ${topic}
Question: ${question}
Options: ${options.join(' | ')}
Correct answer: ${correct}

Return ONLY a single decimal number between 0.0 and 1.0 representing the P-score (proportion of students expected to answer correctly).
Respond with just the number, e.g.: 0.65`
    const result = await model.generateContent(prompt)
    const score = parseFloat(result.response.text().trim())
    return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score))
  } catch {
    return 0.5
  }
}

const csv = `klm_marketing,multiple_choice,Which marketing strategy focuses on KLM's commitment to sustainability?,Fly Responsibly|SkyTeam Elite|BlueBiz|Flying Blue,Fly Responsibly
klm_marketing,true_false,KLM's marketing often emphasizes its heritage as the world's oldest airline operating under its original name.,True|False,True
klm_marketing,multiple_choice,What is the name of KLM's loyalty program for individual frequent flyers?,Miles & More|Flying Blue|Executive Club|SkyMiles,Flying Blue
klm_marketing,multiple_choice,Which social media platform did KLM famously use for its 'Surprise' campaign?,Twitter|LinkedIn|Instagram|TikTok,Twitter
klm_marketing,true_false,KLM's marketing target audience is exclusively business travelers.,True|False,False
klm_marketing,multiple_choice,In KLM marketing campaigns what is the primary color used to represent the brand?,Red|Green|Royal Blue|Yellow,Royal Blue
klm_marketing,true_false,KLM uses AI to personalize offer emails to its customers.,True|False,True
klm_marketing,multiple_choice,Which of these is a key value often promoted in KLM's marketing?,Unreliability|Dutch Hospitality|Low Cost Only|Strict Silence,Dutch Hospitality
klm_marketing,true_false,KLM's 'Lost & Found' team video featured a dog named Sherlock as a marketing stunt.,True|False,True
klm_marketing,multiple_choice,What is the primary goal of the 'Bluey' mascot in KLM marketing?,Cargo tracking|Children's brand experience|Cockpit safety|Engine maintenance,Children's brand experience
klm_brand_management,multiple_choice,What is the core essence of the KLM brand identity?,Innovation and Care|Speed and Power|Luxury and Secrecy|Cheap and Basic,Innovation and Care
klm_brand_management,true_false,The KLM logo has remained completely unchanged since 1919.,True|False,False
klm_brand_management,multiple_choice,Which iconic Dutch gift is synonymous with KLM's brand for Business Class passengers?,Windmill toys|Delft Blue Houses|Tulip bulbs|Cheese wheels,Delft Blue Houses
klm_brand_management,true_false,Brand management at KLM ensures a consistent look across all touchpoints.,True|False,True
klm_brand_management,multiple_choice,The 'Crown' in the KLM logo represents what status?,Military|Royal|Presidential|Private,Royal
klm_brand_management,true_false,KLM is part of the Air France-KLM Group.,True|False,True
klm_brand_management,multiple_choice,What is the English translation of the 'K' in KLM?,King|Kingdom|Royal|Knight,Royal
klm_brand_management,true_false,KLM brand management prohibits the use of the brand name on social media.,True|False,False
klm_brand_management,multiple_choice,KLM's brand tone of voice is typically described as:,Arrogant|Professional yet friendly|Cold and distant|Aggressive,Professional yet friendly
klm_brand_management,true_false,Consistency is a key pillar of KLM brand management.,True|False,True
klm_brand_guide,multiple_choice,What is the specific name of the blue used in the KLM brand guide?,Sky Blue|KLM Blue|Navy Blue|Ocean Blue,KLM Blue
klm_brand_guide,true_false,The KLM brand guide specifies the exact spacing required around the logo.,True|False,True
klm_brand_guide,multiple_choice,Which font is primarily used in KLM's official branding materials?,Comic Sans|Noa|Arial|Times New Roman,Noa
klm_brand_guide,true_false,The brand guide allows the logo to be stretched or distorted for creative effect.,True|False,False
klm_brand_guide,multiple_choice,Which secondary color is often found in the KLM brand guide for 'Warning' or 'Call to action'?,Purple|Orange|Black|Grey,Orange
klm_brand_guide,true_false,The brand guide includes rules for the use of photography and imagery.,True|False,True
klm_brand_guide,multiple_choice,In the KLM brand guide what is the 'Safe Zone'?,A lounge area|The clear space around the logo|The emergency exit|Data storage,The clear space around the logo
klm_brand_guide,true_false,The brand guide covers both digital and print applications.,True|False,True
klm_brand_guide,multiple_choice,How should the KLM logo be aligned according to standard brand guidelines?,Centered or Right-aligned|Always Left-bottom|Top-left or Top-right|Upside down,Top-left or Top-right
klm_brand_guide,true_false,KLM brand guidelines state that icons should be simple and recognizable.,True|False,True
klm_tagless_luggage,multiple_choice,What technology is primarily discussed for KLM tagless luggage solutions?,Steam power|RFID or Digital Tags|Paper only|Manual weighing,RFID or Digital Tags
klm_tagless_luggage,true_false,Tagless luggage aims to speed up the check-in process at the airport.,True|False,True
klm_tagless_luggage,multiple_choice,What is a potential benefit of tagless luggage for passengers?,Heavier bags allowed|Self-service convenience|Free meals|More legroom,Self-service convenience
klm_tagless_luggage,true_false,Tagless luggage technology removes the need for any tracking system.,True|False,False
klm_tagless_luggage,multiple_choice,Which device would a passenger likely use to manage a digital luggage tag?,Toaster|Smartphone|Radio|Landline,Smartphone
klm_tagless_luggage,true_false,KLM has explored permanent e-tags to reduce paper waste.,True|False,True
klm_tagless_luggage,multiple_choice,What does 'tagless' imply in the context of future baggage handling?,No tracking at all|Replacing traditional paper tags|Losing your bags|No luggage allowed,Replacing traditional paper tags
klm_tagless_luggage,true_false,Digital bag tags can be updated with new flight info via Bluetooth or NFC.,True|False,True
klm_tagless_luggage,multiple_choice,Where is the baggage information stored in a tagless system?,On a sticker|In the cloud/Digital system|Inside the suitcase handle|On the pilot's iPad,In the cloud/Digital system
klm_tagless_luggage,true_false,The primary goal of tagless luggage is to increase the weight of the bags.,True|False,False
virtual_humans,multiple_choice,What is a 'Virtual Human' in a digital context?,A robot made of metal|A computer-generated 3D character|A human wearing VR glasses|A pixelated 2D photo,A computer-generated 3D character
virtual_humans,true_false,Virtual humans can be used as digital influencers on platforms like Instagram.,True|False,True
virtual_humans,multiple_choice,What is the 'Uncanny Valley' effect?,A deep canyon|The feeling of unease when a virtual human looks 'almost' real|A mountain in VR|A coding error,The feeling of unease when a virtual human looks 'almost' real
virtual_humans,true_false,Virtual humans are incapable of mimicking human speech patterns.,True|False,False
virtual_humans,multiple_choice,Which industry uses virtual humans for training simulations?,Agriculture|Aviation|Cooking|Gardening,Aviation
virtual_humans,true_false,Motion capture technology is often used to animate virtual humans.,True|False,True
virtual_humans,multiple_choice,What does 'NLP' stand for when a virtual human 'talks' to you?,Natural Language Processing|New Life Program|No Linear Programming|Night Light Power,Natural Language Processing
virtual_humans,true_false,A virtual human can provide 24/7 customer service without getting tired.,True|False,True
virtual_humans,multiple_choice,Which company created the 'MetaHuman Creator' tool?,Apple|Epic Games|Tesla|McDonalds,Epic Games
virtual_humans,true_false,Virtual humans are only used in video games.,True|False,False
vibecoding,multiple_choice,What is 'Vibecoding' primarily associated with?,Writing low-level assembly|Using AI to code based on natural language and 'vibes'|Fixing hardware|Manual data entry,Using AI to code based on natural language and 'vibes'
vibecoding,true_false,Vibecoding relies heavily on Large Language Models (LLMs).,True|False,True
vibecoding,multiple_choice,In the context of Vibecoding what does the user focus on more?,Syntax and semicolons|High-level intent and iterative feedback|Manual memory management|Punch cards,High-level intent and iterative feedback
vibecoding,true_false,Vibecoding makes it possible for non-programmers to build functional apps.,True|False,True
vibecoding,multiple_choice,Which tool is often cited as a leader in the Vibecoding movement?,Cursor|Microsoft Paint|Excel|Calculator,Cursor
vibecoding,true_false,Vibecoding means you never have to check if the code actually works.,True|False,False
vibecoding,multiple_choice,What is the 'Vibe' in Vibecoding referring to?,The music playing|The aesthetic and functional feel described to the AI|The temperature of the CPU|The speed of the internet,The aesthetic and functional feel described to the AI
vibecoding,true_false,Vibecoding encourages rapid prototyping.,True|False,True
vibecoding,multiple_choice,Vibecoding is best described as what type of development?,No-code|AI-augmented development|Manual typing|Assembly coding,AI-augmented development
vibecoding,true_false,Vibecoding eliminates the need for any logical thinking.,True|False,False
klm_marketing,multiple_choice,What is the 'KLM Delft Blue Houses' app used for?,Booking flights|Tracking collected miniature houses|Ordering food|Checking weather,Tracking collected miniature houses
klm_marketing,true_false,KLM was the first airline to offer customer service via WhatsApp.,True|False,True
klm_marketing,multiple_choice,Which city is the destination for most KLM long-haul marketing in Asia?,Tokyo|Bangkok|Beijing|Singapore,Singapore
klm_marketing,true_false,KLM's 'Be My Guest' campaign featured celebrities sitting next to passengers.,True|False,True
klm_marketing,multiple_choice,Which anniversary did KLM celebrate in 2019?,50th|75th|100th|125th,100th
klm_brand_management,multiple_choice,Who is the current CEO of KLM (as of 2024)?,Pieter Elbers|Marjan Rintel|Ben Smith|Richard Branson,Marjan Rintel
klm_brand_management,true_false,KLM stands for Koninklijke Luchtvaart Maatschappij.,True|False,True
klm_brand_management,multiple_choice,Which airline is the primary partner of KLM in France?,Lufthansa|Air France|Iberia|TAP,Air France
klm_brand_management,true_false,The KLM brand is often associated with sustainability initiatives.,True|False,True
klm_brand_guide,multiple_choice,What is the secondary font used for digital body text in the KLM guide?,Roboto|Helvetica|Open Sans|Noa,Noa
klm_brand_guide,true_false,The brand guide specifies that the crown should always be white on a blue background.,True|False,True
klm_brand_guide,multiple_choice,Which of these is NOT a brand guide requirement?,Logo placement|Clearance zones|Mandatory use of red|Color codes,Mandatory use of red
klm_brand_guide,true_false,The brand guide provides templates for business cards.,True|False,True
klm_tagless_luggage,multiple_choice,What is a 'Bag ID' in the context of tagless luggage?,A passport for the bag|A digital identification device|A suitcase brand|A security guard,A digital identification device
klm_tagless_luggage,true_false,Electronic Bag Tags (EBTs) can be embedded directly into suitcases.,True|False,True
klm_tagless_luggage,multiple_choice,How does a tagless bag communicate with airport systems?,Telepathy|NFC or Bluetooth|Smoke signals|Sound waves,NFC or Bluetooth
klm_tagless_luggage,true_false,Tagless luggage systems can help reduce the amount of lost luggage.,True|False,True
virtual_humans,multiple_choice,What is a common use for Virtual Humans in retail?,Janitors|Virtual fit-on and assistants|Security|Delivery drivers,Virtual fit-on and assistants
virtual_humans,true_false,Virtual humans can be controlled by real-time AI agents.,True|False,True
virtual_humans,multiple_choice,Which engine is popular for rendering realistic virtual humans?,Unity/Unreal Engine|Flash|Word|Excel,Unity/Unreal Engine
virtual_humans,true_false,Virtual humans cannot simulate hair or skin textures.,True|False,False
vibecoding,multiple_choice,What is the main advantage of Vibecoding for a startup?,Slower development|Rapid iteration of MVPs|Higher costs|More documentation,Rapid iteration of MVPs
vibecoding,true_false,Vibecoding often involves 'chatting' with an IDE.,True|False,True
vibecoding,multiple_choice,What does the AI do in a Vibecoding session?,Sleeps|Generates code based on the user's description|Deletes files|Plays music,Generates code based on the user's description
vibecoding,true_false,Vibecoding is a form of 'Human-in-the-loop' AI application.,True|False,True
klm_marketing,multiple_choice,What is KLM's slogan?,Fly the friendly skies|Journeys of Inspiration|The World's Local Airline|Just Do It,Journeys of Inspiration
klm_marketing,true_false,KLM uses its Delft Houses to build brand loyalty among World Business Class passengers.,True|False,True
klm_brand_management,multiple_choice,Where is KLM's headquarters located?,Rotterdam|Amstelveen|Utrecht|The Hague,Amstelveen
klm_brand_management,true_false,KLM Royal Dutch Airlines is the flag carrier of the Netherlands.,True|False,True
klm_brand_guide,multiple_choice,What color is the 'KLM Blue' usually defined as in Hex code?,#00A1DE|#FF0000|#000000|#FFFFFF,#00A1DE
klm_brand_guide,true_false,The KLM logo can be used in pink if the designer likes it.,True|False,False
klm_tagless_luggage,multiple_choice,Which airline group has been testing digital bag tags extensively?,Air France-KLM|Ryanair|EasyJet|Wizz Air,Air France-KLM
klm_tagless_luggage,true_false,Digital tags allow passengers to bypass the bag drop counter entirely in some cases.,True|False,True
virtual_humans,multiple_choice,Who is a famous virtual influencer?,Lil Miquela|Barbie|Mickey Mouse|Mario,Lil Miquela
virtual_humans,true_false,Virtual humans are used in mental health therapy as 'digital twins'.,True|False,True
vibecoding,multiple_choice,Which programming language is most commonly 'vibecoded' currently?,COBOL|JavaScript/Python|Fortran|Assembly,JavaScript/Python
vibecoding,true_false,Vibecoding is considered a 'high-code' strictly manual approach.,True|False,False
klm_brand_management,multiple_choice,Which alliance is KLM a founding member of?,Star Alliance|SkyTeam|Oneworld|Utopia,SkyTeam
klm_brand_guide,true_false,The KLM brand guide is only for internal employees.,True|False,False
klm_tagless_luggage,multiple_choice,What is the primary power source for most E-tags?,Gasoline|Batteries or Energy Harvesting|Solar panels|None,Batteries or Energy Harvesting
virtual_humans,true_false,Real-time facial tracking allows a human to 'pilot' a virtual human.,True|False,True`

const rows = csv.trim().split('\n').map(line => {
  const parts = line.split(',')
  const topic = parts[0]
  const type = parts[1]
  const correct_answer = parts[parts.length - 1]
  const options_str = parts[parts.length - 2]
  const question_en = parts.slice(2, parts.length - 2).join(',')
  const options = options_str.split('|')
  return { topic, type, question_en, options, correct_answer }
})

console.log(`Importing ${rows.length} questions...`)

let inserted = 0
for (const row of rows) {
  const p_score = await estimatePScore(row.question_en, row.options, row.correct_answer, row.topic)
  const { error } = await supabase.from('questions').insert({
    topic: row.topic,
    type: row.type,
    question_en: row.question_en,
    options: row.options,
    correct_answer: row.correct_answer,
    p_score,
    ai_p_score_initial: p_score,
    approved: true,
    flagged: false,
  })
  if (error) {
    console.error(`Failed: ${row.question_en.substring(0, 50)} — ${error.message}`)
  } else {
    inserted++
    process.stdout.write(`\r${inserted}/${rows.length} inserted`)
  }
}
console.log(`\nDone! ${inserted}/${rows.length} questions imported.`)
