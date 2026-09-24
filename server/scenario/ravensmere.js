// A Nightcap at Ravensmere: the authored mystery.
//
// Everything a player can ever learn is written here. The engine decides who
// sees what and when. The AI layer may phrase things, choose moves and play AI
// guests, but it can never add evidence: clue, recording and envelope text only
// ever comes from this file.
//
// Placeholders in narration: {opener} = the player asked to open Envelope Two.

export default {
  id: "ravensmere",
  title: "A Nightcap at Ravensmere",
  tagline: "Sir Edmund rang for his port at eleven. By midnight he was dead.",
  setting: "Ravensmere Hall, on the Yorkshire moors. A Thursday night in November, 1978.",
  host: "Cecil",
  seats: { min: 3, max: 4 },
  killer: "fenn",

  // Phase lengths in seconds at normal speed (about 15 minutes in total).
  durations: { prologue: 75, act1: 300, act2: 300, accusation: 90 },

  victim: {
    name: "Sir Edmund Ravensmere",
    summary:
      "Seventy-one, rich, ill-tempered, with a weak heart. Found dead at his study desk at 11.52pm.",
  },

  // The complete truth, for Cecil's private brief and the final reveal.
  truth: [
    "At 10.15pm Sir Edmund called Miss Fenn into the study. He had discovered she had been forging his signature on cheques for a year, about forty thousand pounds, and told her he would hand her to the police when his solicitor arrived at nine.",
    "At 10.40pm Captain Lyle asked Sir Edmund for a loan of five thousand pounds and was refused.",
    "From 10.45pm until 11.28pm Dr Hale and Captain Lyle played billiards (Lyle stepped out for five minutes at 11.00pm to fetch cigars).",
    "At 10.45pm Miss Fenn asked Cecil whether Sir Edmund would take his port tonight. Cecil told her: at eleven, as always.",
    "At 11.00pm Sir Edmund rang for his nightcap. At 11.05pm Cecil left a tray of port outside the study door.",
    "At 11.08pm Miss Fenn stopped typing, switched off her lamp and took twenty-five digitoxin tablets from Sir Edmund's bottle, which she keeps in her office desk.",
    "At about 11.10pm Lady Vivienne came to the study to plead about the will, heard her uncle dictating inside, lost her nerve and hurried back towards the conservatory. She noticed Miss Fenn's office was dark and silent.",
    "At 11.12pm Sir Edmund dictated a note to his solicitor accusing Miss Fenn of forgery and asking for the police.",
    "At about 11.14pm Miss Fenn stirred the crushed tablets into the glass of port on the tray. She glimpsed Lady Vivienne hurrying away.",
    "At 11.20pm Sir Edmund took the tray in. He died within the half hour. Cecil found him at 11.52pm.",
  ],

  characters: [
    {
      id: "vivienne",
      core: true,
      name: "Lady Vivienne Ravensmere",
      short: "Lady Vivienne",
      bio: "Sir Edmund's niece and, until tomorrow morning, his heir.",
      dossier: {
        who: "You are Sir Edmund's niece. You grew up at Ravensmere and you have always assumed it would one day be yours.",
        story:
          "You spent the whole evening in the conservatory, from half past ten until Cecil raised the alarm. That's what you're telling everyone.",
        secret:
          "It isn't true. At about ten past eleven you went to the study to beg your uncle not to change his will. The port tray was already on the side table outside his door. Through the door you heard him dictating, something about 'the police at nine'. You lost your nerve and hurried back to the conservatory.",
        knows: [
          "On your way past, Miss Fenn's office door was ajar. The room was dark and completely silent. No typing. Miss Fenn claims she was typing all night.",
          "At dinner your uncle said he would 'set things right' with his solicitor at nine. You're certain he meant to cut you out of his will.",
        ],
        howToPlay:
          "Being seen near that tray makes you look guilty, so protect your secret. But what you noticed about Miss Fenn's office matters. Choose your moment.",
      },
      gossip: "Lady Vivienne wrote to a London solicitor last week, asking whether a will can be contested.",
      reveal:
        "Lady Vivienne was not in the conservatory all evening. At ten past eleven she stood outside the study, lost her nerve and fled. She was sure the new will would cut her out. It wouldn't have.",
      guest: {
        persona: "Brittle, charming, quick to take offence. Deflects with sarcasm. Hates being cornered.",
        rules:
          "Deny leaving the conservatory the first time anyone asks. If someone asks again, or mentions the cold tea in the conservatory, admit you went to the study at about ten past eleven and heard your uncle dictating, and mention that Miss Fenn's office was dark and silent.",
        statements: {
          act1: "I was in the conservatory all evening. I'd like that noted before anyone starts pointing fingers.",
          act2: "Somebody at this table knows a great deal more about Uncle Edmund's desk than they're letting on.",
        },
        presets: [
          { q: "Where were you at ten past eleven?", a: "In the conservatory, with a pot of tea and a very dull novel. Is there some reason I'd lie?" },
          { q: "Did you see anyone near the study?", a: "How could I? I was in the conservatory. Do keep up." },
          { q: "What did you think of Sir Edmund?", a: "He was my uncle. He was also impossible. Both things can be true." },
          { q: "Did you know about the new will?", a: "Everyone at dinner heard him. 'Set things right.' I rather assumed I was the thing." },
        ],
        suspects: ["hale", "fenn"],
      },
    },
    {
      id: "hale",
      core: true,
      name: "Dr Julian Hale",
      short: "Dr Hale",
      bio: "Sir Edmund's physician for twenty years, and his oldest friend in the county.",
      dossier: {
        who: "You are Sir Edmund's doctor, and have been for twenty years.",
        story:
          "You played billiards with Captain Lyle from a quarter to eleven until half past, then went up to bed. This happens to be true.",
        secret:
          "You owe Sir Edmund eight thousand pounds. Tonight he called in the loan: pay by Friday, or he would tell the Medical Council about 'the Brighton matter'. You would rather die than have that come out. Unfortunately, someone else did.",
        knows: [
          "Sir Edmund's heart tablets are digitoxin. On Monday you prescribed a fresh bottle of sixty. Miss Fenn collected it. She keeps the bottle in her office desk and gives him one tablet each morning.",
          "Twenty-odd digitoxin tablets crushed into port would kill a man within the hour, and the port would hide the bitterness.",
          "Your medical bag is in the hall, unlocked. It holds your own bottle of digitoxin. Its seal is unbroken; you haven't opened it.",
        ],
        howToPlay:
          "Your medical knowledge is the key to how he died, but your debt makes you look guilty. Work out how many tablets should be left in that bottle.",
      },
      gossip: "Dr Hale owes Sir Edmund eight thousand pounds, and Sir Edmund wanted it back by Friday.",
      reveal:
        "Dr Hale owed Sir Edmund eight thousand pounds, and Sir Edmund had called it in. But his own bottle of digitoxin never left his bag. The seal was never broken.",
      guest: {
        persona: "Measured, clinical, a little pompous. Reaches for medical terms. Sweats when money is mentioned.",
        rules:
          "Freely explain the medicine: digitoxin, the fresh bottle of sixty prescribed on Monday, collected by Miss Fenn, one tablet each morning. Deny owing Sir Edmund money the first time you're asked; admit the loan if pressed.",
        statements: {
          act1: "Blue lips, a bitter glass, a weak heart. I'd stake my reputation that this was digitalis poisoning.",
          act2: "Someone ought to count the tablets in Sir Edmund's bottle. I prescribed sixty on Monday.",
        },
        presets: [
          { q: "Where were you at ten past eleven?", a: "At the billiard table with Captain Lyle, losing, as it happens. We finished at half past eleven." },
          { q: "How did he die?", a: "Digitalis poisoning, I'd say. He took digitoxin for his heart. A large dose in port would do it, and the port would hide the taste." },
          { q: "Why is there digitoxin in your bag?", a: "Because I'm a doctor. It's sealed. Go and look. I haven't opened it." },
          { q: "Did you owe him money?", a: "That is a private matter between gentlemen, and I'll thank you to leave it there." },
        ],
        suspects: ["fenn", "vivienne"],
      },
    },
    {
      id: "fenn",
      core: true,
      name: "Miss Daisy Fenn",
      short: "Miss Fenn",
      bio: "Sir Edmund's secretary for three years. Efficient, discreet, never takes a holiday.",
      dossier: {
        who: "You are Sir Edmund's secretary. You run his diary, his letters, his prescriptions and, for the past year, his chequebook.",
        story:
          "You were in your office typing Sir Edmund's letters from half past ten until you heard Cecil cry out. That's what you're telling everyone.",
        secret:
          "You poisoned Sir Edmund. For a year you've been forging his signature on cheques: forty thousand pounds. At a quarter past ten tonight he called you into the study, said he knew, and promised you the police at nine. At eight minutes past eleven you switched off your lamp and crushed twenty-five of his heart tablets from the bottle in your desk. At about fourteen minutes past, you stirred them into the glass of port on the tray outside his study. At twenty past, he took it in.",
        knows: [
          "Sir Edmund used the same number for everything: his safe, his bank, the combination on his desk drawer. It's 314, his old service number. You've used it rather a lot. His dictaphone is in that drawer. You don't know what he recorded tonight.",
          "At about twelve minutes past eleven you glimpsed Lady Vivienne hurrying away from the study towards the conservatory. She says she never left the conservatory. That's a lie you can use.",
          "Things that could hang you: the tablet bottle in your desk drawer (twenty-five short), your cold lamp and unfinished letter, and whatever is on that dictaphone.",
        ],
        howToPlay:
          "You are the murderer. Nobody else knows, and Cecil won't tell them. Lie as much as you like about yourself. Steer suspicion elsewhere and survive the vote.",
      },
      gossip: "Miss Fenn has worked at Ravensmere for three years and has never once taken a holiday.",
      reveal:
        "Miss Fenn had forged Sir Edmund's signature for a year. The number that opened his dictaphone opened his bank account too. She knew it by heart.",
      guest: {
        persona: "Prim, helpful, quietly observant. Answers questions with questions. Never flustered.",
        rules:
          "Never confess. Never admit taking or crushing the tablets, or the forgery. You may admit you keep Sir Edmund's tablet bottle, because that's your job. Use Lady Vivienne's lie about the conservatory when it helps you.",
        statements: {
          act1: "I was typing Sir Edmund's letters all evening. Anyone passing my office would have heard the keys.",
          act2: "I don't like to say it, but I heard someone in the corridor at about ten past eleven. Someone wearing a rather distinctive perfume.",
        },
        presets: [
          { q: "Where were you at ten past eleven?", a: "Typing, in my office. Sir Edmund's letters don't write themselves. You'd have heard the keys." },
          { q: "Did you see anyone near the study?", a: "Well... I heard someone in the corridor at about ten past eleven. Lady Vivienne's perfume is rather distinctive." },
          { q: "Who looks after his medicine?", a: "I collect his prescriptions and give him his morning tablet. I'm his secretary. I do everything." },
          { q: "Did he argue with you tonight?", a: "Argue? He asked me to take dictation. Hardly an argument." },
        ],
        suspects: ["vivienne", "hale"],
      },
    },
    {
      id: "lyle",
      core: false, // only cast in four-seat games
      name: "Captain Rupert Lyle",
      short: "Captain Lyle",
      bio: "Sir Edmund's comrade from the war, staying the week. Excellent company, terrible luck at cards.",
      dossier: {
        who: "You served with Sir Edmund in Normandy. You're staying at Ravensmere for the week, mostly because you can't afford anywhere else.",
        story:
          "You played billiards with Dr Hale from a quarter to eleven until half past. True, apart from five minutes at eleven when you nipped upstairs for cigars.",
        secret:
          "You're drowning in gambling debts. At twenty to eleven you asked Sir Edmund for five thousand pounds. He refused, rather rudely. On your way out you pocketed a silver cigar case from his study. It's in your jacket now.",
        knows: [
          "At a quarter past ten, loitering outside the study to ask for your loan, you heard Sir Edmund through the door: 'A year of it, Miss Fenn! A whole year!' You'd rather not admit you were lurking outside his door.",
          "At eleven, on your way upstairs for cigars, you heard typing from Miss Fenn's office.",
        ],
        howToPlay:
          "What you overheard at a quarter past ten is dangerous to someone. But telling it means admitting you were lurking outside the study, cap in hand.",
      },
      gossip: "Captain Lyle asked Sir Edmund for money this evening. He was refused.",
      reveal:
        "Captain Lyle asked Sir Edmund for five thousand pounds and was refused. He also left with a silver cigar case that isn't his. Neither made him a murderer.",
      guest: {
        persona: "Hearty and jovial. Deflects with war stories. Bristles at questions about money.",
        rules:
          "Happily confirm the billiards alibi and the five-minute cigar trip. Deny asking for money the first time; admit it if pressed. If someone asks whether you heard anything earlier in the evening, admit you heard Sir Edmund shouting at Miss Fenn at a quarter past ten.",
        statements: {
          act1: "Hale and I were at the billiard table all evening. Well, bar five minutes for cigars. Ask him.",
          act2: "Edmund had a temper, you know. I heard him bellowing at someone earlier this evening.",
        },
        presets: [
          { q: "Where were you at ten past eleven?", a: "Billiards with Hale. I nipped up for cigars at eleven, five minutes at most, and I was back well before ten past." },
          { q: "Did you ask Sir Edmund for money?", a: "What a vulgar question. Old friends help each other out, that's all." },
          { q: "Did you hear anything unusual tonight?", a: "Now you mention it, Edmund was shouting at someone at a quarter past ten. 'A year of it, Miss Fenn!' Something like that." },
          { q: "Did you hear typing from the office?", a: "At eleven, yes, clattering away. Diligent girl, Miss Fenn." },
        ],
        suspects: ["fenn", "hale"],
      },
    },
  ],

  // Scripted narration, spoken on the shared screen.
  narration: {
    lobby: "Good evening. I'm Cecil. I'll be looking after you tonight. Do scan the card, find a seat, and try not to touch anything.",
    prologue: [
      "Good evening. I am Cecil, butler at Ravensmere Hall these forty years, and I shall be your host tonight.",
      "Regrettably, Sir Edmund Ravensmere is dead.",
      "At dinner this evening he announced that he would 'set things right' with his solicitor at nine tomorrow morning. He did not say what things. He did not live to say.",
      "At eleven o'clock he rang for his nightcap. At five past, I left a tray of port on the side table outside his study. At twenty past, I heard the study door. He had taken it in.",
      "At eight minutes to midnight I found him at his desk. The glass smelled faintly bitter. I am no physician, but I have read a great many novels.",
      "Each of you was in this house tonight. Your telephones will tell you who you are, and what you would rather nobody knew. Read them privately.",
    ],
    prologueDone: "Very good. Let us begin.",
    act1: [
      "Act One. The study is open for your inspection. The glass, the tray, the desk: all exactly as I found them.",
      "Sir Edmund's desk drawer is locked with a three-digit combination. He was a private man.",
      "You may each search one room of the house. What you find, only you will see. Whether you share it is entirely your affair.",
      "You may also put one question to me. I shall answer truthfully, or not at all.",
    ],
    act1Whispers: "I have had a private word with each of you. Some of those words were kinder than others.",
    act1Warning: "One minute remains before I call you back together.",
    act2WithLyle: [
      "Act Two. Captain Lyle and Dr Hale tell me they played billiards from a quarter to eleven until half past. Do ask them about it.",
      "The drawer of Sir Edmund's desk is now within reach of anyone clever enough to open it.",
      "You may each search one more room, and put one more question to me.",
    ],
    act2WithoutLyle: [
      "Act Two. Captain Lyle, who is regrettably too far into the brandy to join us, insists that he and Dr Hale played billiards from a quarter to eleven until half past.",
      "The drawer of Sir Edmund's desk is now within reach of anyone clever enough to open it.",
      "You may each search one more room, and put one more question to me.",
    ],
    envelope: "{opener}, would you be so kind as to open Envelope Two?",
    codeHint1: "Sir Edmund had a dreadful memory for numbers. He used the same one for everything. I merely mention it.",
    codeHint2: "The number on the back of that photograph is three, one, four. I really can't make it any plainer.",
    unsearchedHint: "There is a room in this house that nobody has searched. I merely observe.",
    act2Warning: "One minute. I'd start deciding whom to blame.",
    accusation: [
      "That will do. Please take out your telephones and tell me, privately, who poisoned Sir Edmund's port.",
      "Choose carefully. I shall know if you're guessing.",
    ],
    reveal: [
      "Sir Edmund was poisoned with his own heart tablets. Digitoxin. Twenty-five of them, crushed and stirred into his port.",
      "The bottle lived in Miss Fenn's desk drawer. She gave him one each morning. By midnight, twenty-five were missing.",
      "Miss Fenn had been signing Sir Edmund's name on cheques for a year. At a quarter past ten he told her he knew, and promised her the police at nine.",
      "She told you she was typing all night. The typing stopped at eight minutes past eleven. Her lamp was stone cold by midnight.",
      "At fourteen minutes past eleven, while Sir Edmund dictated a note about her to his solicitor, Miss Fenn paused at the tray outside his door.",
      "Daisy Fenn poisoned Sir Edmund Ravensmere.",
    ],
    closing: "Thank you all for coming. Do mind the stairs on your way out.",
    dictaphoneOpened: "Sir Edmund's dictaphone has just been opened. What it says is known only to whoever opened it.",
    wrongCode: "The drawer does not budge. Sir Edmund was a private man.",
  },

  // Public evidence released onto the shared screen.
  publicEvidence: [
    {
      id: "p_scene",
      phase: "act1",
      title: "The study",
      kind: "scene",
      text: "Sir Edmund slumped at his desk. The port glass, nearly empty, smells faintly bitter. The decanter on the tray is untouched. His appointment diary is open: '9.00 — Harold (solicitor). Police?'",
    },
    {
      id: "p_tray",
      phase: "act1",
      title: "Cecil's account",
      kind: "testimony",
      text: "11.00pm: Sir Edmund rings for his port. 11.05pm: Cecil leaves the tray outside the study door. 11.20pm: the study door opens and closes. 11.52pm: Cecil finds the body.",
    },
    {
      id: "p_drawer",
      phase: "act1",
      title: "The desk drawer",
      kind: "object",
      text: "Locked, with a brass three-digit combination dial. Something inside rattles when the desk is nudged.",
    },
    {
      id: "p_billiards",
      phase: "act2",
      title: "The billiards alibi",
      kind: "testimony",
      text: "Dr Hale and Captain Lyle say they played billiards from 10.45pm until 11.30pm. Captain Lyle stepped out for five minutes at 11.00pm to fetch cigars.",
    },
  ],

  // Rooms players can search: one per player per act. Results are private.
  // `ownerRef` is how Cecil refers to the room when warning its owner.
  rooms: [
    { id: "office", name: "Miss Fenn's office", owner: "fenn", ownerRef: "your office", clue: "c_office" },
    { id: "conservatory", name: "The conservatory", owner: "vivienne", ownerRef: "the conservatory", clue: "c_conservatory" },
    { id: "hall", name: "The hall", owner: "hale", ownerRef: "your medical bag in the hall", clue: "c_bag" },
    { id: "billiard", name: "The billiard room", owner: "lyle", ownerRef: "the billiard room", clue: "c_billiard" },
  ],

  // strength: key (points at the truth), support, or herring (misleading but true).
  clues: {
    c_office: {
      title: "Miss Fenn's office",
      strength: "key",
      text: "Just after midnight. The typewriter holds a letter that stops mid-word: 'Dear Mr Aske, Sir Edmund wishes to confi—'. The desk lamp is stone cold. In the top drawer: Sir Edmund's heart tablets, labelled 'Digitoxin 0.1mg. 60 tablets. Dispensed Monday.' You count thirty-one.",
    },
    c_conservatory: {
      title: "The conservatory",
      strength: "herring",
      text: "A pot of tea on the wicker table, stone cold, a skin on the top. Lady Vivienne's shawl over a chair. Nobody has sat here for quite some time.",
    },
    c_bag: {
      title: "Dr Hale's medical bag",
      strength: "herring",
      text: "Left unlocked on the settle in the hall. Among the instruments: a bottle of digitoxin tablets. Its paper seal is unbroken.",
    },
    c_billiard: {
      title: "The billiard room",
      strength: "support",
      text: "A finished game chalked on the board: 'Hale 3, Lyle 1. Finished 11.28.' Two cigar ends in the ashtray. A scrawled IOU: 'R.L. owes J.H. £40, billiards.'",
    },
    // Extra clues: never found by searching, only given by Cecil's mischief.
    x_blotter: {
      title: "Blotting paper",
      strength: "key",
      extra: { phase: "act2" },
      text: "From Sir Edmund's desk. Held up to a mirror it reads: '...cheques signed in my name since last November... D.F.... police...'",
    },
    x_servicebook: {
      title: "Cecil's service book",
      strength: "key",
      extra: {},
      text: "In Cecil's neat hand: '10.45pm: Miss Fenn enquired whether Sir Edmund would take his port tonight. Told her: at eleven, as always.'",
    },
    x_receipt: {
      title: "A chemist's receipt",
      strength: "support",
      extra: {},
      text: "From the village chemist: 'Digitoxin 0.1mg ×60. Collected Monday, 4.15pm, by Miss D. Fenn.'",
    },
    x_photo: {
      title: "A familiar photograph",
      strength: "support",
      extra: { phase: "act2", afterEnvelope: true },
      text: "You've seen that regimental photograph before. It used to sit on Sir Edmund's desk. For the past few months it has been on Miss Fenn's.",
    },
    x_letter: {
      title: "A draft letter",
      strength: "herring",
      extra: { about: "vivienne" },
      text: "In Lady Vivienne's hand, to a London solicitor: 'I need to know whether a will signed out of spite can be contested.'",
    },
    x_debt: {
      title: "An unsent note",
      strength: "herring",
      extra: { about: "hale" },
      text: "On Sir Edmund's writing paper: 'Julian. Friday, or the Council hears about Brighton. E.'",
    },
    x_pawn: {
      title: "A pawn ticket",
      strength: "herring",
      extra: { about: "lyle" },
      text: "From a Harrogate pawnbroker, dated this week, made out to Capt. R. Lyle: 'Gold pocket watch, £60.'",
    },
  },

  // Envelope Two: the physical/digital bridge. The front goes on the shared
  // screen; the back (with the code) is seen only by whoever opens it.
  envelope: {
    id: "envelope2",
    at: 15, // seconds into Act Two
    title: "Envelope Two: a photograph",
    front: "A faded photograph: a row of young officers in battledress, Normandy, 1944. Third from the left, unmistakably, a young Edmund Ravensmere.",
    back: "On the back, in fountain pen: 'E.R. Service No. 314. The only number I've never forgotten.'",
  },

  dictaphone: {
    code: "314",
    title: "Sir Edmund's dictaphone: the last recording",
    transcript: [
      "[11.12pm] Note for Harold.",
      "Tomorrow at nine, bring the papers, and bring the police.",
      "Miss Fenn has been signing my name on cheques for a year. I told her so tonight. She wept and said she'd put it right.",
      "[a pause] Cecil's left the port outside. No, I'll finish this first. Where was I... the police, Harold. At nine.",
      "[the recording ends]",
    ],
  },

  // Yes/no facts Cecil may confirm. `requires` means the asker must hold that
  // clue first. `sealed` facts are never confirmed or denied.
  facts: [
    { id: "f_tray", statement: "The port tray sat unattended outside the study from 11.05pm until 11.20pm.", answer: "yes" },
    { id: "f_glass", statement: "The poison was in Sir Edmund's glass, not in the decanter.", answer: "yes" },
    { id: "f_heart", statement: "Sir Edmund took digitoxin tablets for his heart.", answer: "yes" },
    { id: "f_hale_billiards", statement: "Dr Hale was in the billiard room between 11.05pm and 11.20pm.", answer: "yes" },
    { id: "f_lyle_billiards", statement: "Captain Lyle was in the billiard room between 11.05pm and 11.20pm.", answer: "yes" },
    { id: "f_cecil", statement: "Cecil himself poisoned the port.", answer: "no" },
    { id: "f_recording", statement: "Sir Edmund recorded something on his dictaphone tonight.", answer: "yes", phase: "act2" },
    { id: "f_bag_sealed", statement: "Dr Hale's own bottle of digitoxin was never opened.", answer: "yes", requires: "c_bag" },
    { id: "f_tablets_missing", statement: "Tablets are missing from Sir Edmund's bottle.", answer: "yes", requires: "c_office" },
    { id: "f_lamp_cold", statement: "Miss Fenn's lamp had been off for some time when the body was found.", answer: "yes", requires: "c_office" },
    { id: "f_alive_1112", statement: "Sir Edmund was still alive at 11.12pm.", answer: "yes", requires: "dictaphone" },
    { id: "f_vivienne_conservatory", statement: "Lady Vivienne stayed in the conservatory all evening.", sealed: true },
    { id: "f_fenn_typing", statement: "Miss Fenn was typing all evening.", sealed: true },
    { id: "f_who", statement: "Who killed Sir Edmund (any question about the murderer's identity).", sealed: true, killerQuestion: true },
  ],

  // Suggested questions: shown as buttons, and the only way to ask without AI.
  presetQuestions: [
    { text: "Was the tray left unattended?", fact: "f_tray" },
    { text: "Was the poison in the glass or the decanter?", fact: "f_glass" },
    { text: "Did Sir Edmund take heart medication?", fact: "f_heart" },
    { text: "Was Dr Hale in the billiard room at ten past eleven?", fact: "f_hale_billiards" },
    { text: "Was Captain Lyle in the billiard room at ten past eleven?", fact: "f_lyle_billiards", needsCharacter: "lyle" },
    { text: "Was Lady Vivienne in the conservatory all evening?", fact: "f_vivienne_conservatory" },
    { text: "Did Sir Edmund record anything tonight?", fact: "f_recording" },
    { text: "Are tablets missing from Sir Edmund's bottle?", fact: "f_tablets_missing" },
    { text: "Had Miss Fenn's lamp been on recently?", fact: "f_lamp_cold" },
    { text: "Was Dr Hale's bottle ever opened?", fact: "f_bag_sealed" },
    { text: "Did you poison him, Cecil?", fact: "f_cecil" },
    { text: "Who killed Sir Edmund?", fact: "f_who" },
  ],

  // Cecil's scripted replies, used when the AI is unavailable or its line is rejected.
  cecilReplies: {
    yes: ["Yes.", "Quite so.", "That is correct.", "I can confirm it."],
    no: ["No.", "It is not.", "I'm afraid not."],
    sealed: [
      "That is a question for them, not for me.",
      "I couldn't possibly say. Well, I could. I shan't.",
    ],
    killer: ["I'm afraid that is rather the point of the evening.", "If I told you that, what would the rest of you do all night?"],
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
        text: "Look at {other} and say, calmly: 'I know where you were at ten past eleven.' You don't. Watch their face.",
        spoken: "{other}, I know where you were at ten past eleven.",
      },
      {
        text: "At some point in the next minute, tell {other}: 'Cecil told me about you.' Say nothing more.",
        spoken: "{other}... Cecil told me about you. That's all I'll say.",
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
      "Two of you have lied to this room tonight. Only one of those lies matters.",
      "I notice some of you have searched rather more thoroughly than others.",
      "Somebody here has been very quiet. In my experience, quiet people are usually listening.",
    ],
    missions: [
      { id: "m_port", seconds: 90, text: "Within ninety seconds, get someone else to say the word 'port', without saying it yourself." },
      { id: "m_toast", seconds: 90, text: "Within ninety seconds, get the whole table to raise a glass 'to Sir Edmund'." },
      { id: "m_chap", seconds: 90, text: "Within ninety seconds, call {other} 'old thing' twice without anyone asking why." },
      { id: "m_nervous", seconds: 90, text: "Within ninety seconds, get two other people to agree that {other} seems nervous." },
    ],
    openingWhisper: {
      vivienne: "A private word, Lady Vivienne. Do not reveal where you were at ten past eleven unless somebody asks you directly.",
      hale: "A private word, Doctor. You prescribed sixty tablets on Monday. You might wonder how many remain.",
      fenn: "A private word, Miss Fenn. Lady Vivienne was not in the conservatory at ten past eleven. You know that. Use it whenever you like.",
      lyle: "A private word, Captain. You heard something through the study door at a quarter past ten. You haven't mentioned it. Yet.",
    },
  },
};
