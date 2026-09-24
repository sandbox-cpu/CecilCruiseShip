// Dead Reckoning: the authored mystery aboard the SS Halcyon.
//
// SERVER ONLY. This file is the complete truth of the case: the culprit, the
// method, the motive, the twist and every puzzle answer. The engine decides who
// sees what and when; nothing here is ever sent to a browser except through
// Game.hostView() and Game.playerView(), which are the information firewall.
// The AI layer may phrase things, choose moves and play AI guests, but clue,
// recording and telegram text only ever comes from this file.
//
// How the case works, for whoever maintains it (spoilers, obviously):
//
// - Mortimer Crane was killed in his cabin at 12.40am by Penelope Ashdown, the
//   ship's Social Hostess. Seven years ago she was Penelope Garland; Crane's
//   column drove her fiancé, Robin Hartley, to shoot himself, and last night he
//   recognised her and promised to do it again in Sunday's paper.
// - She moved the body along the crew alleyway in a laundry trolley at about
//   1.45am and propped it against No. 7 lifeboat, soaked in brandy, at the spot
//   where his diary said Miss Kingsley was due to meet him "at 1.15, new time".
//   Then she sat down at the Smoking Room card table, five minutes before the
//   clocks went back.
// - The twist: Coral Kingsley (the decoy) went to No. 7 boat at 1.15am, second
//   time round, meaning to kill him, found him slumped there, and heaved him
//   over the rail. She believes she killed him. He had been dead for an hour and
//   a half. Her phone looks exactly like the murderer's.
// - The deduction: the lookout, the cabin, the trolley and the recording (with
//   the 1.10am whistle salute on it) show he died long before he went into the
//   sea. At 12.40 Miss Kingsley was dancing; Mr Quill heard a woman in the cabin
//   at 12.50; Miss Ashdown's card-table alibi only covers the second hour.
//
// Placeholders in narration: {opener} = the player asked to open the telegram,
// {decoy} = whoever is playing Miss Kingsley (reveal only).

export default {
  id: "halcyon",
  title: "Dead Reckoning",
  subtitle: "A murder aboard the SS Halcyon",
  tagline: "At two o'clock the clocks went back an hour. At twenty past one, Mortimer Crane went over the side.",
  setting: "The SS Halcyon, three nights out of Madeira and bound for Barbados. October 1961.",
  place: "aboard the SS Halcyon",
  theme: "halcyon",
  host: "Cecil",
  seats: { min: 3, max: 4 },
  killer: "ashdown",
  decoy: "kingsley",
  optional: "pryce",

  // Phase lengths in seconds at normal speed (about 16 minutes in total).
  durations: { prologue: 90, act1: 300, act2: 330, accusation: 90 },

  cecil: {
    intro: "the Chief Purser of the SS Halcyon these twenty-two years",
    title: "Chief Purser",
    sub: "Chief Purser, your host",
    never: "Never give the combination of Mr Crane's attaché case, or hint at how to work it out.",
    // Extra rules for this case's AI prompt: the twist must survive until the reveal.
    rules: [
      "Never say or hint that Mr Crane was dead before he went into the sea, or that anyone other than the murderer believes they are guilty.",
      "Never say who put Mr Crane over the side.",
    ],
  },

  // Shown only after the votes are in.
  twist: {
    headline: "You didn't kill him.",
    detail: "He had been dead for an hour and a half when you put him over the side.",
    tag: "put him over the side",
  },

  victim: {
    name: "Mr Mortimer Crane",
    summary:
      "Fifty-eight. Writes 'Crane's Nest', the gossip column of the Sunday Courier. Went over the side at 1.20am, after the clocks went back. The sea did not give him back.",
  },

  // The complete truth, for Cecil's private brief and the final reveal.
  truth: [
    "At 10.14pm Crane cabled his newspaper: 'Whatever became of the girl in the Hartley affair? She is aboard. Splash Sunday.'",
    "At 11.20pm, at the Captain's table, Crane said to Miss Ashdown, 'Hartley. Now there's a name I haven't written in years.' She went white. Seven years ago she was Penelope Garland, engaged to Robin Hartley, who shot himself after Crane's column about him.",
    "At 11.40pm Miss Kingsley drew £500 in cash from the Purser's Bureau. Crane was blackmailing her, and had told her to bring it to No. 7 lifeboat at a quarter past one, 'new time', after the clocks went back.",
    "At 12.25am Crane left the Gala Ball for cabin A128. From 12.28 to 12.33 Mr Pryce, the Radio Officer, was with him, selling him copies of passengers' telegrams for £20. Crane said he was expecting a lady.",
    "At 12.34am Miss Ashdown knocked. Crane switched on the wire recorder hidden in his attaché case. At 12.40 she struck him with the heavy glass ashtray from his desk. He fell and did not get up.",
    "At 12.45am Miss Kingsley was photographed dancing with the Staff Captain in the ballroom.",
    "At 12.50am Mr Quill, who had slipped away from the card table to buy Crane's silence, knocked at A128 and heard a woman inside whisper, 'Oh God.' He crept away.",
    "At 1.10am, the first time round, the Halcyon exchanged whistle salutes with the Aurora. The recorder heard it. Soon after, Miss Ashdown left the cabin with his notebook and a page torn from his diary. She threw the ashtray into the sea.",
    "At about 1.45am, still the first time round, she wheeled the body along the crew alleyway in a laundry trolley, wedging the crew door open with a folded tombola card, and left him slumped against No. 7 boat, soaked in his own brandy. Mr Pryce saw the trolley from the radio room window.",
    "At 1.56am she ordered a gin in the Smoking Room and joined Mr Quill's card table. At 2.00am the clocks went back to 1.00am.",
    "At 1.15am, the second time round, Miss Kingsley reached No. 7 boat meaning to kill Crane. She found him slumped at the rail, heaved him over the side and ran, losing her glove and the money. He was already dead.",
    "At 1.20am, the second time round, the lookout raised the alarm. Miss Ashdown and Mr Quill were at the card table. The Halcyon searched for four hours.",
  ],

  characters: [
    {
      id: "kingsley",
      core: true,
      crew: false,
      name: "Miss Coral Kingsley",
      short: "Miss Kingsley",
      bio: "'Britain's sweetheart of 1949', sailing for a Hollywood comeback.",
      dossier: {
        who: "You are Coral Kingsley, the film star. Twelve years ago you were the most famous face in England. A Hollywood studio has offered you one last chance, with a morals clause in the contract.",
        story:
          "You left the Gala Ball at one o'clock, took a sleeping pill and slept until the alarm woke you. That's what you're telling everyone.",
        secret:
          "Your 'late husband', the war hero you mourn in every interview, is alive, in Dartmoor, serving twelve years for armed robbery, and you are still married to him. Crane had your letters. He wanted £500 at No. 7 lifeboat at a quarter past one, 'new time, after the clocks go back'. You went up meaning to end it. He was slumped against the lifeboat, reeking of brandy, and didn't answer when you said his name. You took hold of him and heaved him over the rail. He didn't make a sound. Seconds later someone shouted 'Man overboard!' You ran, and dropped the money.",
        knows: [
          "At a quarter to one you were dancing with the Staff Captain in the ballroom. The ship's photographer took your picture.",
          "At the Captain's table, Crane leaned over to Miss Ashdown, the Social Hostess, and said, 'Hartley. Now there's a name I haven't written in years.' She went white as a sheet.",
          "Things that could hang you: the envelope of money and the silver glove you lost at No. 7 boat, and the £500 you drew from the Purser's Bureau at twenty to midnight.",
        ],
        howToPlay:
          "Nobody else knows what you did at No. 7 boat, and Cecil won't tell them. Lie as much as you like about yourself. Steer suspicion elsewhere and survive the vote.",
      },
      gossip: "Miss Kingsley drew five hundred pounds in cash from the Purser's Bureau at twenty to midnight.",
      reveal:
        "Miss Kingsley went to No. 7 boat at a quarter past one, second time round, meaning to kill Mortimer Crane, and put him over the side. He had been dead for an hour and a half. Her 'late husband' is alive, in Dartmoor, and still married to her.",
      guest: {
        persona: "Grand, theatrical, a little brittle. Calls everyone 'darling'. Turns every question into a performance.",
        rules:
          "Deny leaving your cabin after one o'clock the first time anyone asks. If someone mentions the money, the envelope, the glove or No. 7 boat, admit you went up at a quarter past one to pay him, and insist you lost your nerve and left. Never admit touching him or putting him over the side. Point out that at a quarter to one you were dancing with the Staff Captain. You may repeat what Crane said to Miss Ashdown at the Captain's table.",
        statements: {
          act1: "I took a sleeping pill at one o'clock and slept like the dead until that dreadful alarm. Darling, I'm an actress, not an athlete.",
          act2: "Mortimer Crane made enemies the way other men make small talk. Ask Miss Ashdown what he said to her at dinner.",
        },
        presets: [
          { q: "Where were you at twenty past one?", a: "In bed, darling, with a sleeping pill and an eye mask. Ask anyone. No, don't; they were all asleep too." },
          { q: "Where were you at a quarter to one?", a: "Dancing with the Staff Captain. The photographer took our picture. I looked divine." },
          { q: "Why did you draw five hundred pounds?", a: "A lady never discusses her money. Or her age. Or her husbands." },
          { q: "Did Crane have something on you?", a: "Crane had something on everyone. That was his entire charm, such as it was." },
        ],
        suspects: ["ashdown", "quill"],
      },
    },
    {
      id: "quill",
      core: true,
      crew: false,
      name: "Mr Laurence Quill",
      short: "Mr Quill",
      bio: "A gentleman of independent means, travelling alone. Plays a great deal of bridge.",
      dossier: {
        who: "You are Laurence Quill. You travel first class, dress beautifully and play cards every night. You win rather often.",
        story:
          "You were at the card table in the Smoking Room from eleven until the alarm. That's what you're telling everyone. It's true, apart from ten minutes at a quarter to one that you'd rather not discuss.",
        secret:
          "You're a card sharp: 'Gentleman Larry', put off the Queen Mary in 1958 for marked cards. Crane recognised you at dinner and promised you a paragraph on Sunday. At a quarter to one you slipped away to his cabin, A128, to offer him money to forget you. His 'Do Not Disturb' card was up. You knocked. No answer. Then, from inside, a woman's voice whispered, 'Oh God. Oh God.' You assumed he had company and crept away.",
        knows: [
          "Miss Ashdown says she came to the Smoking Room at half past twelve. She didn't. She walked in with rain on her shoulders a few minutes before the steward put the clock back at two. You remember because she ordered a gin and French and you dealt her in.",
          "When the alarm went at twenty past one, second time round, Miss Ashdown was sitting opposite you. That much of her story is true.",
          "The whisper you heard through Crane's door was at about ten to one. Whoever was in there with him was a woman.",
        ],
        howToPlay:
          "You heard a woman in Crane's cabin at ten to one. Saying so means admitting you went there, cap in hand, and why. Choose your moment.",
      },
      gossip: "Mr Quill has won at cards every single night of this voyage.",
      reveal:
        "Mr Quill is 'Gentleman Larry', put off the Queen Mary for marked cards. At ten to one he knocked on Crane's door to buy his silence, and heard the murderer whispering inside.",
      guest: {
        persona: "Silky, amused, unhurried. Talks like a man holding a good hand. Hates being asked about money.",
        rules:
          "Freely confirm that you and Miss Ashdown were at the card table when the alarm went. Deny leaving the table the first time you're asked; if pressed, admit you sat out ten minutes at a quarter to one, went to Crane's cabin to 'have a word', found the Do Not Disturb card, knocked, and heard a woman whisper inside. If asked when Miss Ashdown arrived, say she came in wet, a few minutes before the clocks went back. Deny being a card sharp.",
        statements: {
          act1: "Miss Ashdown and I were at the card table when the alarm went. We'd have made very poor murderers from there.",
          act2: "Everybody wants to know about twenty past one. I'd be more interested in twenty to one.",
        },
        presets: [
          { q: "Where were you at twenty past one?", a: "At the card table, holding three aces. Miss Ashdown was opposite. It was a very good evening until it wasn't." },
          { q: "Did you leave the card table?", a: "A gentleman doesn't keep a diary of his comfort breaks. Ten minutes, perhaps. Around a quarter to one." },
          { q: "When did Miss Ashdown arrive?", a: "Just before the steward put the clock back. Rain on her shoulders. I dealt her in and took four shillings off her." },
          { q: "Did Crane know something about you?", a: "Crane thought he knew something about everyone. It kept him young." },
        ],
        suspects: ["kingsley", "ashdown"],
      },
    },
    {
      id: "ashdown",
      core: true,
      crew: true,
      name: "Miss Penelope Ashdown",
      short: "Miss Ashdown",
      bio: "The Halcyon's Social Hostess. Runs the dances and the tombola, and knows everyone's name.",
      dossier: {
        who: "You are the Halcyon's Social Hostess. You seat the Captain's table, call the tombola and dance with lonely widowers. You know every passenger by name and every crew passage by heart.",
        story:
          "When the Gala Ball wound down at half past twelve you went off duty and straight to the Smoking Room, where you watched the card game until the alarm. That's what you're telling everyone.",
        secret:
          "Seven years ago your name was Penelope Garland, and you were engaged to Robin Hartley. Crane's column called Robin a coward and a cheat, and Robin shot himself. You changed your name and went to sea. Tonight at the Captain's table Crane recognised you and promised Sunday's readers 'whatever became of the girl in the Hartley affair'. At 12.34 you went to his cabin to beg. He laughed at you. You hit him with the heavy glass ashtray from his desk, and he fell and didn't get up. You scrubbed the carpet, took his notebook and a page from his diary, and threw the ashtray into the sea. At a quarter to two, before the clocks went back, you wheeled him along the crew alleyway in a laundry trolley, left him slumped against No. 7 lifeboat and poured his brandy over him. Then you walked into the Smoking Room and ordered a gin.",
        knows: [
          "The diary page you tore out says: 'No. 7 boat — 1.15, new time — C.K. — bring it.' At twenty past one, second time round, while you sat at the card table, someone put him over the side. It can only have been whoever came to meet him. C.K.: Miss Kingsley. She thinks she killed him. Let her.",
          "Your alibi for twenty past one is perfect: you were at the card table with Mr Quill when the alarm went, and the steward saw you. Nobody needs to know you only sat down five minutes before the clocks went back.",
          "Things that could hang you: the laundry trolley you left at the foot of the crew stair, the tombola card you wedged in the crew door, and whatever Crane kept in that locked attaché case. You couldn't open it, and you didn't dare take it.",
        ],
        howToPlay:
          "You are the murderer. Nobody else knows, and Cecil won't tell them. Everyone will assume he died when he went over the side. Keep them thinking so, and survive the vote.",
      },
      gossip: "Miss Ashdown joined the Halcyon Line in 1955 and has never once taken shore leave in England.",
      reveal:
        "Miss Ashdown was once Penelope Garland. Crane's column drove her fiancé to his death, and last night he meant to do it to her. She killed him at twenty to one, moved him along the crew alleyway, and sat down to cards with an alibi for the wrong hour.",
      guest: {
        persona: "Bright, brisk and professionally charming. Remembers everyone's name. Never lets the smile slip.",
        rules:
          "Never confess. Never admit going to cabin A128, touching Crane, moving him or using the laundry trolley. Insist you went to the Smoking Room at half past twelve and stayed until the alarm; the steward will confirm you were at the card table at twenty past one. Use Miss Kingsley's appointment at No. 7 boat, her £500 and her lost glove whenever it helps you. Deny ever having been called Garland.",
        statements: {
          act1: "I was at the card table in the Smoking Room when the alarm went. Mr Quill will tell you. So will the steward.",
          act2: "I'd ask who had an appointment on the Boat Deck at a quarter past one. Someone at this table did.",
        },
        presets: [
          { q: "Where were you at twenty past one?", a: "At the card table in the Smoking Room, watching Mr Quill take everyone's money. The steward will swear to it." },
          { q: "Where were you at twenty to one?", a: "Going off duty. The Social Hostess is never off duty for long, so I went where the passengers were." },
          { q: "What did Crane say to you at dinner?", a: "Something tiresome about an old story. He said tiresome things to everyone. It was his profession." },
          { q: "Do you use the crew alleyway?", a: "Every day, dozens of times. So do four hundred crew. It isn't a secret passage, darling, it's a corridor." },
        ],
        suspects: ["kingsley", "quill"],
      },
    },
    {
      id: "pryce",
      core: false, // only cast in four-seat games
      crew: true,
      name: "Mr Owen Pryce",
      short: "Mr Pryce",
      bio: "The Halcyon's Radio Officer. Every telegram aboard passes through his hands.",
      dossier: {
        who: "You are the Halcyon's Radio Officer. Every message in or out of this ship, from passengers' telegrams to the Captain's weather reports, goes through your key and into your log.",
        story:
          "You were in the radio room all night, logging traffic. That's what you're telling everyone. It's true, apart from five minutes at half past twelve.",
        secret:
          "For two years you've been selling Crane copies of passengers' private telegrams, £20 a time. At 12.28 you took him tonight's batch in A128. He was alive, smug, and said he was 'expecting a lady'. You left at 12.33 and went back to the radio room.",
        knows: [
          "At 10.14pm Crane cabled his paper: 'WHATEVER BECAME OF THE GIRL IN THE HARTLEY AFFAIR STOP SHE IS ABOARD STOP SPLASH SUNDAY.' You don't know who she is.",
          "At ten past one, first time round, you logged the Halcyon's whistle salute with her sister ship, the Aurora: three long blasts each.",
          "At about a quarter to two, before the clocks went back, you looked out of the radio room window and saw someone in a crew oilskin pushing a laundry trolley aft along the Boat Deck in the rain. You took them for a steward. Odd hour for laundry.",
        ],
        howToPlay:
          "You were the last honest witness to see Crane alive, and he was expecting a lady. Saying so means admitting what he was paying you for.",
      },
      gossip: "Mr Pryce reads every telegram aboard. He says it's his job. It is, rather.",
      reveal:
        "Mr Pryce sold Crane copies of passengers' telegrams for two years. At 12.33 he left Crane alive, expecting a lady. At a quarter to two he watched the body go past his window in a laundry trolley and thought nothing of it.",
      guest: {
        persona: "Precise, nervous and Welsh. Talks in times and call signs. Goes very still when money comes up.",
        rules:
          "Freely explain the radio log and the whistle salute at ten past one, first time round. Mention the laundry trolley you saw on the Boat Deck at about a quarter to two, before the clocks went back. Deny visiting Crane's cabin the first time you're asked; if pressed, admit you took him some papers at half past twelve, and that he was alive and said he was expecting a lady. Deny selling telegrams.",
        statements: {
          act1: "I was in the radio room all night. Every signal in and out of this ship is in my log, to the minute.",
          act2: "Nobody's asked me about the laundry trolley. Odd hour for laundry, a quarter to two.",
        },
        presets: [
          { q: "Where were you at twenty past one?", a: "In the radio room, sending the man-overboard warning. It's in the log. Everything's in the log." },
          { q: "What did you hear last night?", a: "At ten past one, first time round, we exchanged whistle salutes with the Aurora. Three long blasts each. You'd have felt it in your teeth." },
          { q: "Did you see anything odd?", a: "About a quarter to two, before the clocks went back, somebody in a crew oilskin pushing a laundry trolley aft along the Boat Deck. In the rain." },
          { q: "Did you know Crane?", a: "I transmitted his telegrams. That's all. Every word of them is confidential." },
        ],
        suspects: ["kingsley", "quill"],
      },
    },
  ],

  // What the phones say at the top of a guilty dossier. Each seat only ever
  // receives its own line; the two read alike on purpose.
  banners: {
    killer: "You killed him. Nobody else knows. Keep it that way.",
    decoy: "You put him over the side. Nobody else knows. Keep it that way.",
  },

  // Scripted narration, spoken on the shared screen.
  narration: {
    lobby: "Good evening. I'm Cecil, Chief Purser. Do scan the card, find your seat, and keep your hands inside the rail.",
    prologue: [
      "Good evening. I am Cecil, Chief Purser of the SS Halcyon these twenty-two years, and I shall be your host this evening.",
      "Regrettably, Mr Mortimer Crane is no longer with us. He went over the side at twenty past one this morning.",
      "Mr Crane wrote a column called 'Crane's Nest', in which he told the nation other people's secrets. He was aboard, he said, for a story.",
      "At two o'clock the ship's clocks went back an hour, as they do each night we steam west. So there were two twenty-past-ones this morning. He went over during the second.",
      "The lookout raised the alarm. We searched for four hours. The sea did not give him back. Our next port is Bridgetown, four days away.",
      "The Captain has asked me to find out, discreetly, how Mr Crane came to leave us. Your telephones will tell you who you are, and what you would rather nobody knew. Read them privately.",
    ],
    prologueDone: "Very good. Let us begin.",
    act1: [
      "Act One. The Boat Deck, beside No. 7 lifeboat, where Mr Crane went over. The evidence is on the screen.",
      "Mr Crane's attaché case is locked with three brass dials. He was a man who kept things.",
      "You may each search one place aboard. What you find, only you will see. The crew alleyway is closed to passengers until Act Two. Crew go where they please. They usually do.",
      "You may also put one question to me. I shall answer truthfully, or not at all.",
    ],
    act1Whispers: "I have had a private word with each of you. The Purser's Bureau never really closes.",
    act1Warning: "One minute before I call you back to the table.",
    act2: [
      "Act Two. The bridge log is on the screen. Mr Pryce, our Radio Officer, logged every signal last night. Do ask him about it.",
      "The crew alleyway is now open to all of you, and Mr Crane's attaché case is within reach of anyone clever enough to open it.",
      "You may each search one more place, and put one more question to me.",
    ],
    act2Without: [
      "Act Two. The bridge log is on the screen. Mr Pryce, our Radio Officer, is on watch and cannot join us, but his log is at your disposal.",
      "The crew alleyway is now open to all of you, and Mr Crane's attaché case is within reach of anyone clever enough to open it.",
      "You may each search one more place, and put one more question to me.",
    ],
    envelope: "{opener}, a telegram came for Mr Crane last night, and I have been holding it at the Bureau. Would you be so kind as to open it?",
    codeHint1: "Mr Crane had a shocking memory for numbers. His newspaper did not. I merely mention it.",
    codeHint2: "Mr Crane's cabin was A128, and his newspaper says he liked it back to front. Eight, two, one. I really can't make it plainer.",
    unsearchedHint: "There is a place aboard that nobody has searched. I merely observe.",
    act2Warning: "One minute. I'd start deciding whom to throw to the sharks.",
    accusation: [
      "That will do. Please take out your telephones and tell me, privately, who killed Mortimer Crane.",
      "Choose carefully. I shall know if you're guessing.",
    ],
    reveal: [
      "Mortimer Crane did not drown. He was dead an hour and a half before he went into the sea.",
      "At twenty-five to one he let a visitor into cabin A128, and the wire recorder in his attaché case heard every word. At twenty to one she struck him down with the ashtray from his desk.",
      "She scrubbed the carpet, took his notebook and waited. At a quarter to two, before the clocks went back, she wheeled him along the crew alleyway in a laundry trolley and left him slumped against No. 7 boat, soaked in his own brandy.",
      "Then she walked into the Smoking Room, ordered a gin, and was sitting at the card table when the alarm went. At twenty past one. The second time.",
      "Seven years ago she was Penelope Garland. Crane's column drove the man she loved to his grave, so she went to sea under a new name. Last night, at the Captain's table, he recognised her.",
      "Penelope Ashdown killed Mortimer Crane.",
      "Which leaves the matter of who put him over the side. {decoy} did, believing him alive. He wasn't. She is guilty of a great many things tonight. Murder is not among them.",
    ],
    closing: "Thank you all for sailing with us. Do mind the rail on your way out.",
    dictaphoneOpened: "Mr Crane's attaché case has just been opened. What was inside is known only to whoever opened it.",
    wrongCode: "The case stays shut. Mr Crane was a careful man.",
  },

  // Words the shared screen and the phones use for this case. Everything here
  // is public: nothing about the solution or the twist.
  labels: {
    phases: { act1: "Act One · The Boat Deck", act2: "Act Two · The Recording" },
    accuse: "Who killed Mortimer Crane?",
    search: {
      title: "Search a place aboard",
      note: "One place per act. Only you will see what you find.",
      later: "You can search when an act is under way.",
      again: "You can search again next act.",
      empty: "You haven't found anything yet. Search a place aboard from the Act tab.",
      restricted: "Crew only until Act Two",
    },
    envelope: {
      name: "The telegram",
      open: "Open the telegram",
      asked: "Cecil has asked you to open the telegram he's been holding for Mr Crane.",
      physical: "Open the real telegram from the evidence pack, then tap below.",
      privacy: "The front goes on the big screen. The back is for your eyes only.",
      source: "The telegram · only you can see the back",
      toast: "The telegram is on the big screen. Check the back.",
      task: "Cecil would like you to open the telegram he's been holding for Mr Crane. Tap 'Open the telegram'. The front goes on the big screen; the back is for your eyes only.",
      taskPhysical: "Cecil would like you to open the telegram from the evidence pack. Tap 'Open the telegram' when you do, and keep the back to yourself unless you choose to share it.",
      opened: "{opener} opened the telegram.",
    },
    lock: {
      title: "Mr Crane's attaché case",
      ready: "Three brass dials. He was a man who kept things.",
      closed: "Out of reach until Act Two.",
      notYet: "The attaché case is out of reach until Act Two.",
      heard: "You've heard what was in Mr Crane's attaché case. It's in your clues.",
      button: "Try the case",
      opened: "The case opens. His wire recorder is inside; the recording is in your clues.",
      tried: "Someone tried Mr Crane's attaché case. It stayed shut.",
      source: "The wire recorder",
      aria: "Three-digit combination",
      whisperKiller: "Someone has just opened Mr Crane's attaché case. You don't know what's inside. They do.",
      whisperOther: "Someone has just opened Mr Crane's attaché case. It wasn't you. Perhaps ask around.",
      revealOpener: "It was {other} who opened Mr Crane's attaché case. I thought you should know.",
      digits: 3,
    },
    whisperNote: "A glowing envelope means Cecil has just had a private word with someone. Only they know what he said.",
    evidenceEmpty: "Nothing yet. Cecil will lay out the evidence when Act One begins.",
  },

  // Public evidence released onto the shared screen.
  publicEvidence: [
    {
      id: "p_scene",
      phase: "act1",
      title: "No. 7 lifeboat, Boat Deck",
      kind: "scene",
      text: "Starboard side, aft. At 1.20am, second time round, the lookout saw a man go over the rail here. A lifebuoy and its light went in after him. The Halcyon searched until dawn. Mr Crane was never found.",
    },
    {
      id: "p_account",
      phase: "act1",
      title: "Cecil's account",
      kind: "testimony",
      text: "12.25am: Mr Crane leaves the Gala Ball for his cabin, A128, and hangs out his 'Do Not Disturb' card. 2.00am: clocks go back to 1.00am. 1.20am (second time): man overboard. 1.30am (second time): Cecil opens A128. Empty. The bed has not been slept in.",
    },
    {
      id: "p_programme",
      phase: "act1",
      title: "Today's Programme",
      kind: "object",
      text: "Slipped under every cabin door: '10.00pm Tombola in the Ballroom with your Social Hostess, Miss Ashdown. 11.30pm The Captain's Gala Ball. PLEASE NOTE: clocks will be retarded one hour at 2.00am. Kindly put your watches back on retiring.'",
    },
    {
      id: "p_case",
      phase: "act1",
      title: "Mr Crane's attaché case",
      kind: "object",
      text: "Brought up from A128 by Cecil. Pigskin, heavy for its size, locked with three brass dials.",
    },
    {
      id: "p_bridge",
      phase: "act2",
      title: "The bridge log",
      kind: "record",
      text: "01.10: Exchanged whistle salutes with RMS Aurora, eastbound, three long blasts each. 02.00: Clocks retarded one hour. 01.20: Lookout reports MAN OVERBOARD, starboard side aft. Wheel hard over. Lifebuoys away. 05.30: Search abandoned.",
    },
    {
      id: "p_lookout",
      phase: "act2",
      title: "The lookout's report",
      kind: "testimony",
      text: "'He went over like a sack of coal, sir. Didn't cry out. Didn't kick. The lifebuoy light was right on him and he never came up.'",
    },
    {
      id: "p_steward",
      phase: "act2",
      title: "The Smoking Room steward",
      kind: "testimony",
      text: "'Miss Ashdown and Mr Quill were both at the card table when the alarm went at twenty past one. I'll swear to it.'",
    },
  ],

  // Places players can search: one per player per act. Results are private.
  // `ownerRef` is how Cecil refers to the place when warning its owner.
  // `crewOnly` places are open to crew characters in Act One, and to everyone in Act Two.
  rooms: [
    { id: "cabin", name: "Mr Crane's cabin, A128", owner: null, clue: "c_cabin" },
    { id: "boat", name: "No. 7 lifeboat", owner: "kingsley", ownerRef: "No. 7 lifeboat", clue: "c_boat" },
    { id: "smoking", name: "The Smoking Room", owner: "quill", ownerRef: "the card table in the Smoking Room", clue: "c_smoking" },
    { id: "alleyway", name: "The crew alleyway", owner: "ashdown", ownerRef: "the crew alleyway", clue: "c_alley", crewOnly: true },
    { id: "radio", name: "The radio room", owner: "pryce", ownerRef: "the radio room", clue: "c_radio" },
  ],

  // strength: key (points at the truth), support, or herring (misleading but true).
  clues: {
    c_cabin: {
      title: "Mr Crane's cabin, A128",
      strength: "key",
      text: "The bed hasn't been slept in. The heavy glass ashtray that sits on every A Deck desk is missing. By the desk, a patch of carpet has been scrubbed; it's still damp, and smells of carbolic. His travelling clock hasn't been put back: it's an hour ahead of every other clock aboard. His brandy decanter has gone. A thin wire runs from a vase of carnations into his locked attaché case.",
    },
    c_boat: {
      title: "No. 7 lifeboat",
      strength: "herring",
      text: "Tucked under the edge of the lifeboat's canvas cover: a sodden envelope holding five hundred pounds in new fivers, and a lady's silver evening glove, left hand. In the scuppers, an empty cut-glass decanter with a silver label: 'Brandy · A128'. The rail here reeks of it.",
    },
    c_smoking: {
      title: "The Smoking Room",
      strength: "support",
      text: "The card table's score pad, in Mr Quill's neat hand: 'L.Q. sat out, 12.45–12.55.' The steward's chit book: 'Miss P. Ashdown · gin and French · 1.56am', her first drink of the night; the next line reads 'Clocks back, 2.00.' In the table drawer, a spare pack of cards. The backs are very faintly marked.",
    },
    c_alley: {
      title: "The crew alleyway",
      strength: "key",
      text: "At the foot of the crew stair up to the Boat Deck: a laundry trolley, its canvas damp and smeared rust-brown. Jammed in one wheel is a man's black patent evening pump. One deck up, the steel door from the A Deck passenger corridor into the alleyway had been wedged open with a folded tombola card.",
    },
    c_radio: {
      title: "The radio room log",
      strength: "support",
      text: "22.14: Crane to Sunday Courier, London: 'WHATEVER BECAME OF THE GIRL IN THE HARTLEY AFFAIR STOP SHE IS ABOARD STOP SPLASH SUNDAY.' 23.50: Courier to Crane, sent to the Purser's Bureau. 01.10: Whistle salute, RMS Aurora. 02.00: Clocks retarded. 01.20: MAN OVERBOARD, navigational warning sent.",
    },
    // Extra clues: never found by searching, only given by Cecil's mischief.
    x_cutting: {
      title: "A yellowed cutting",
      strength: "key",
      extra: { phase: "act2" },
      text: "Tucked into the lining of Crane's writing case: his own column, June 1954. 'THE HARTLEY TRAGEDY. Young Guards officer found shot. His fiancée, Miss Penelope Garland, 22, is said to be inconsolable.'",
    },
    x_records: {
      title: "From the Purser's records",
      strength: "key",
      extra: {},
      text: "Cecil's own crew register: 'ASHDOWN, Penelope. Social Hostess. Joined the Halcyon Line March 1955. Previously known as: GARLAND.'",
    },
    x_steward: {
      title: "The night steward's book",
      strength: "support",
      extra: {},
      text: "A Deck, in the night steward's pencil: '12.32am: Miss Ashdown asked whether Mr Crane had come down from the Ball. Told her yes, A128.'",
    },
    x_photo: {
      title: "The ship's photographer's print No. 48",
      strength: "support",
      extra: {},
      text: "The ballroom at the Gala. Miss Kingsley is dancing with the Staff Captain. The clock over the bandstand behind them reads a quarter to one.",
    },
    x_cash: {
      title: "The Bureau ledger",
      strength: "herring",
      extra: { about: "kingsley" },
      text: "From the Purser's Bureau: 'Miss C. Kingsley, cash withdrawal, £500 in new fivers, 11.40pm.'",
    },
    x_marked: {
      title: "A page from Crane's notebook",
      strength: "herring",
      extra: { about: "quill" },
      text: "In Crane's spiky hand: 'Quill = Gentleman Larry. Put off the Queen Mary, 1958. Marked cards. Sunday?'",
    },
    x_informant: {
      title: "Crane's pocket-book",
      strength: "herring",
      extra: { about: "pryce" },
      text: "A list of payments, the last one in tonight's date: 'R/O Pryce, 12.30am, £20, telegrams.'",
    },
  },

  // The telegram (Envelope Two's role): the front goes on the shared screen;
  // the back (with how to open the case) is seen only by whoever opens it.
  envelope: {
    id: "envelope2",
    at: 15, // seconds into Act Two
    title: "A telegram for Mr Crane",
    front: "MARCONIGRAM · SS HALCYON · RECEIVED 11.50PM. To: Mr M. Crane, Cabin A128. From: Sunday Courier newsdesk, London. 'SPLASH APPROVED FOR SUNDAY STOP NAME HER IN FULL STOP'",
    back: "The last lines, folded under: 'PS CASE COMBINATION YOU FORGOT IS WHAT YOU TOLD ME BEFORE YOU SAILED STOP YOUR CABIN NUMBER BACK TO FRONT STOP DO TRY MORTIMER.'",
  },

  dictaphone: {
    code: "821",
    title: "Mr Crane's wire recorder: the last recording",
    transcript: [
      "[a knock at the door] CRANE (quietly, to the machine): Twelve thirty-four. Here she is.",
      "CRANE: Come in, my dear. Shut the door. I rather thought you might call.",
      "A WOMAN (low): You can't print it. Please.",
      "CRANE: 'Whatever became of the girl in the Hartley affair?' She went to sea and changed her name. It's a lovely story.",
      "THE WOMAN: He was twenty-three. He shot himself because of what you wrote.",
      "CRANE: He shot himself because he was weak. Now run along. I have someone to see at a quarter past one.",
      "[a heavy blow. A fall. Something rolls across the floor.]",
      "[a long silence. Then a whisper:] Oh God. Oh God.",
      "[water running. Scrubbing. Drawers opening. A knock at the door; a pause; footsteps going away.]",
      "[far off, the ship's whistle: three long blasts. Fainter, from somewhere out at sea, three more.]",
      "[the cabin door opens and closes. The wire runs out.]",
    ],
  },

  // Yes/no facts Cecil may confirm. `requires` means the asker must hold that
  // clue first. `sealed` facts are never confirmed or denied.
  facts: [
    { id: "f_clocks", statement: "The ship's clocks went back an hour at two o'clock, so the hour after one o'clock happened twice.", answer: "yes" },
    { id: "f_second", statement: "Mr Crane went over the rail during the second twenty past one, after the clocks went back.", answer: "yes" },
    { id: "f_ball", statement: "Mr Crane left the Gala Ball at 12.25am.", answer: "yes" },
    { id: "f_bed", statement: "Mr Crane's bed had been slept in.", answer: "no" },
    { id: "f_quill_alarm", statement: "Mr Quill was at the card table when the alarm sounded.", answer: "yes" },
    { id: "f_ashdown_alarm", statement: "Miss Ashdown was at the card table when the alarm sounded.", answer: "yes" },
    { id: "f_cecil", statement: "Cecil himself had a hand in Mr Crane's death.", answer: "no" },
    { id: "f_recording", statement: "Mr Crane recorded something last night.", answer: "yes", phase: "act2" },
    { id: "f_whistle", statement: "The Halcyon sounded her whistle during the night.", answer: "yes", phase: "act2" },
    { id: "f_travel_clock", statement: "Mr Crane's travelling clock had been put back an hour.", answer: "no", requires: "c_cabin" },
    { id: "f_carpet", statement: "Someone cleaned Mr Crane's cabin after he left the Ball.", answer: "yes", requires: "c_cabin" },
    { id: "f_trolley", statement: "Something heavy was moved along the crew alleyway last night.", answer: "yes", requires: "c_alley" },
    { id: "f_alive_1234", statement: "Mr Crane was alive at 12.34am.", answer: "yes", requires: "dictaphone" },
    { id: "f_alive_overboard", statement: "Mr Crane was alive when he went over the side.", answer: "no", requires: "dictaphone" },
    { id: "f_kingsley_cabin", statement: "Miss Kingsley was in her cabin when the alarm sounded.", sealed: true },
    { id: "f_ashdown_1240", statement: "Miss Ashdown was in the Smoking Room at twenty to one.", sealed: true },
    { id: "f_quill_left", statement: "Mr Quill left the card table during the night.", sealed: true },
    { id: "f_who", statement: "Who killed Mortimer Crane (any question about the murderer's identity).", sealed: true, killerQuestion: true },
  ],

  // Suggested questions: shown as buttons, and the only way to ask without AI.
  presetQuestions: [
    { text: "Did the clocks go back last night?", fact: "f_clocks" },
    { text: "Did he go over during the second twenty past one?", fact: "f_second" },
    { text: "Had Mr Crane's bed been slept in?", fact: "f_bed" },
    { text: "Was Mr Quill at the card table when the alarm went?", fact: "f_quill_alarm" },
    { text: "Was Miss Ashdown at the card table when the alarm went?", fact: "f_ashdown_alarm" },
    { text: "Was Miss Kingsley in her cabin when the alarm went?", fact: "f_kingsley_cabin" },
    { text: "Had Mr Crane put his clock back?", fact: "f_travel_clock" },
    { text: "Was anything moved along the crew alleyway?", fact: "f_trolley" },
    { text: "Did Mr Crane record anything last night?", fact: "f_recording" },
    { text: "Was he alive when he went over the side?", fact: "f_alive_overboard" },
    { text: "Did you push him, Cecil?", fact: "f_cecil" },
    { text: "Who killed Mortimer Crane?", fact: "f_who" },
  ],

  // Cecil's scripted replies, used when the AI is unavailable or its line is rejected.
  cecilReplies: {
    yes: ["Yes.", "Quite so.", "That is correct.", "I can confirm it."],
    no: ["No.", "It is not.", "I'm afraid not."],
    sealed: [
      "That is a question for them, not for me.",
      "I couldn't possibly say. Well, I could. I shan't.",
    ],
    killer: ["I'm afraid that is rather the point of the voyage.", "If I told you that, what would the rest of you do all night?"],
    locked: ["You'd have to see that for yourself first.", "Look before you ask, I'd suggest."],
    later: ["Ask me again a little later."],
    unclear: ["I'm not sure I follow. Try one of the questions I've suggested."],
  },

  // Content for Cecil's mischief moves. The engine decides which moves are
  // legal; Cecil (or the fallback) picks one.
  mischief: {
    // `text` is whispered to a human; an AI guest says `spoken` out loud instead.
    bluffs: [
      {
        text: "Look at {other} and say, calmly: 'I know where you were when the clocks went back.' You don't. Watch their face.",
        spoken: "{other}, I know where you were when the clocks went back.",
      },
      {
        text: "At some point in the next minute, tell {other}: 'Cecil showed me your telegram.' Say nothing more.",
        spoken: "{other}... Cecil showed me your telegram. That's all I'll say.",
      },
      {
        text: "Ask {other}, in front of everyone, why their story has changed. It hasn't. Yet.",
        spoken: "{other}, why has your story changed?",
      },
    ],
    blank: {
      private: "I have nothing for you. But the others don't know that. Do look worried.",
      public: "A private word with {target}. Nothing that need concern the rest of you. Probably.",
    },
    teases: [
      "More than one of you has lied to this table about last night. Only one of you is lying about murder.",
      "I notice some of you have searched rather more thoroughly than others.",
      "Everyone is terribly interested in twenty past one. I've always found twenty to one the more interesting hour.",
    ],
    missions: [
      { id: "m_overboard", seconds: 90, text: "Within ninety seconds, get someone else to say the word 'overboard', without saying it yourself." },
      { id: "m_toast", seconds: 90, text: "Within ninety seconds, get the whole table to raise a glass 'to absent friends'." },
      { id: "m_shipmate", seconds: 90, text: "Within ninety seconds, call {other} 'shipmate' twice without anyone asking why." },
      { id: "m_seasick", seconds: 90, text: "Within ninety seconds, get two other people to agree that {other} looks seasick." },
    ],
    openingWhisper: {
      kingsley: "A private word, Miss Kingsley. Somebody at this table has reason to think they know where you were at a quarter past one. It isn't me.",
      quill: "A private word, Mr Quill. You sat out a rubber at a quarter to one. You might consider what you heard, and whether it's worth more than your reputation.",
      ashdown: "A private word, Miss Ashdown. Miss Kingsley drew five hundred pounds in cash from my Bureau at twenty to midnight. I wonder what for. Use it whenever you like.",
      pryce: "A private word, Mr Pryce. You looked out of the radio room window at a quarter to two. Most people wouldn't have thought twice about what they saw.",
    },
  },

  // Timed private words that belong to this case alone.
  whispers: [
    {
      key: "decoy-doubt",
      phase: "act2",
      at: 130,
      to: "kingsley",
      text: "A private word, Miss Kingsley. He was awfully heavy, wasn't he? And awfully quiet. I merely mention it.",
    },
  ],

  // What the leak guard looks for in AI-written lines (regular expression sources).
  guard: {
    guilt: "\\b(kill\\w*|murder\\w*|guilt\\w*|culprit|did it|struck|strike|hit (him|crane)|ashtray|trolley|scrubb?\\w*|carbolic|garland|hartley|moved (him|the body)|tombola card)\\b",
    motive: "\\b(garland|hartley|fianc\\w*|changed her name|new name|guards officer)\\b",
    code: "\\b8\\s*[-,.]?\\s*2\\s*[-,.]?\\s*1\\b|eight[\\s,-]+two[\\s,-]+one|back to front",
    confession: "\\b(i|we)\\b[^.!?]{0,40}\\b(kill\\w*|murder\\w*|struck|hit him|moved (him|the body)|trolley|ashtray|put him over|push\\w*|shov\\w*|heav\\w* him|threw him)\\b|\\b(i did it|it was me|i confess)\\b",
    secrets: "\\b(already dead|dead before|was dead when|dead when he went|dartmoor|gentleman larry|marked cards)\\b",
  },
};
