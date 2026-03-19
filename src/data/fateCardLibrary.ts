// src/data/fateCardLibrary.ts

export type FateCard = {
    id: string;
    name: string;
    type: "other";
    subtype: "fate";
    quest: string;
    flavorText: string;
    effect: string;
    imageUrl?: string;
  };
  
  import fate_blistering_infection from "../assets/cards/other/fate_blistering_infection.png";
  import fate_healing_rejection from "../assets/cards/other/fate_healing_rejection.png";
  import fate_leeching_curse from "../assets/cards/other/fate_leeching_curse.png";
  import fate_mental_fog from "../assets/cards/other/fate_mental_fog.png";
  import fate_plague_echo from "../assets/cards/other/fate_plague_echo.png";
  import fate_withering_grip from "../assets/cards/other/fate_withering_grip.png";
  
  export const fateCardLibrary: FateCard[] = [
    {
      id: "fate_blistering_infection",
      name: "Blistering Infection",
      type: "other",
      subtype: "fate",
      quest: "Hotel of Despair",
      flavorText: "Boils fester on your skin, pulsing with plague",
      effect: "You start the next battle at -2 HP per group member.",
      imageUrl: fate_blistering_infection,
    },
    {
      id: "fate_healing_rejection",
      name: "Healing Rejection",
      type: "other",
      subtype: "fate",
      quest: "Hotel of Despair",
      flavorText: "The infection twists every attempt to make you whole.",
      effect: "You are unable to heal during the first 2 rounds of the next battle.",
      imageUrl: fate_healing_rejection,
    },
    {
      id: "fate_leeching_curse",
      name: "Leeching Curse",
      type: "other",
      subtype: "fate",
      quest: "Hotel of Despair",
      flavorText: "The woods take more than blood. They take what made you you.",
      effect: "You lose 1 skill permanently.",
      imageUrl: fate_leeching_curse,
    },
    {
      id: "fate_mental_fog",
      name: "Mental Fog",
      type: "other",
      subtype: "fate",
      quest: "Hotel of Despair",
      flavorText: "A thick mental haze clouds your thoughts.",
      effect: "Your Intelligence category is reduced by 1.",
      imageUrl: fate_mental_fog,
    },
    {
      id: "fate_plague_echo",
      name: "Plague Echo",
      type: "other",
      subtype: "fate",
      quest: "Hotel of Despair",
      flavorText: "You hear whispers that aren’t there...and maybe never were.",
      effect: "You’re disoriented and miss your first turn in the next battle.",
      imageUrl: fate_plague_echo,
    },
    {
      id: "fate_withering_grip",
      name: "Withering Grip",
      type: "other",
      subtype: "fate",
      quest: "Hotel of Despair",
      flavorText: "Your limbs are stiff and brittle from the infection.",
      effect: "Your Strength category is reduced by 1.",
      imageUrl: fate_withering_grip,
    },
  ];
  
  export const hotelOfDespairFateCards = fateCardLibrary.filter(
    (card) => card.quest === "Hotel of Despair"
  );