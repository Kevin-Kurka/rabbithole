import { registerEnumType } from 'type-graphql';

export enum LogicClass {
    FALLACY = 'FALLACY',
    FORMAL_ARGUMENT = 'FORMAL_ARGUMENT'
}

export enum LogicCategory {
    // Fallacy Categories
    RELEVANCE = 'RELEVANCE',
    PRESUMPTION = 'PRESUMPTION',
    CAUSAL = 'CAUSAL',

    // Formal Argument Categories
    DEDUCTIVE = 'DEDUCTIVE',
    INDUCTIVE = 'INDUCTIVE'
}

export enum LogicType {
    // Fallacies of Relevance
    AD_HOMINEM = 'AD_HOMINEM',
    STRAW_MAN = 'STRAW_MAN',
    RED_HERRING = 'RED_HERRING',
    AD_POPULUM = 'AD_POPULUM',
    APPEAL_TO_EMOTION = 'APPEAL_TO_EMOTION',

    // Fallacies of Presumption
    BEGGING_THE_QUESTION = 'BEGGING_THE_QUESTION',
    FALSE_DILEMMA = 'FALSE_DILEMMA',
    NO_TRUE_SCOTSMAN = 'NO_TRUE_SCOTSMAN',

    // Causal Fallacies
    POST_HOC = 'POST_HOC',
    SLIPPERY_SLOPE = 'SLIPPERY_SLOPE',
    HASTY_GENERALIZATION = 'HASTY_GENERALIZATION',

    // Deductive Reasoning
    CATEGORICAL_SYLLOGISM = 'CATEGORICAL_SYLLOGISM',
    MODUS_PONENS = 'MODUS_PONENS',
    MODUS_TOLLENS = 'MODUS_TOLLENS',

    // Inductive Reasoning
    GENERALIZATION = 'GENERALIZATION',
    ANALOGY = 'ANALOGY',
    ABDUCTION = 'ABDUCTION'
}

// Register enums for GraphQL
registerEnumType(LogicClass, {
    name: 'LogicClass',
    description: 'The high-level classification of a logical argument (Fallacy or Formal)'
});

registerEnumType(LogicCategory, {
    name: 'LogicCategory',
    description: 'The category of the logical argument or fallacy'
});

registerEnumType(LogicType, {
    name: 'LogicType',
    description: 'The specific type of logical argument or fallacy'
});

export interface LogicDefinition {
    type: LogicType;
    name: string;
    description: string;
    class: LogicClass;
    category: LogicCategory;
}

export const LOGIC_TREE: Record<LogicType, LogicDefinition> = {
    // Fallacies of Relevance
    [LogicType.AD_HOMINEM]: {
        type: LogicType.AD_HOMINEM,
        name: 'Ad Hominem',
        description: 'Attacking the character, motive, or other attribute of the person making the argument, rather than addressing the substance of the argument itself.',
        class: LogicClass.FALLACY,
        category: LogicCategory.RELEVANCE
    },
    [LogicType.STRAW_MAN]: {
        type: LogicType.STRAW_MAN,
        name: 'Straw Man',
        description: "Misrepresenting an opponent's argument to make it easier to attack.",
        class: LogicClass.FALLACY,
        category: LogicCategory.RELEVANCE
    },
    [LogicType.RED_HERRING]: {
        type: LogicType.RED_HERRING,
        name: 'Red Herring',
        description: 'Introducing an irrelevant topic to divert attention from the original issue.',
        class: LogicClass.FALLACY,
        category: LogicCategory.RELEVANCE
    },
    [LogicType.AD_POPULUM]: {
        type: LogicType.AD_POPULUM,
        name: 'Ad Populum',
        description: 'Arguing that a proposition must be true just because many or most people believe it.',
        class: LogicClass.FALLACY,
        category: LogicCategory.RELEVANCE
    },
    [LogicType.APPEAL_TO_EMOTION]: {
        type: LogicType.APPEAL_TO_EMOTION,
        name: 'Appeal to Emotion',
        description: "Manipulating the recipient's emotions in order to win an argument, in the absence of factual evidence.",
        class: LogicClass.FALLACY,
        category: LogicCategory.RELEVANCE
    },

    // Fallacies of Presumption
    [LogicType.BEGGING_THE_QUESTION]: {
        type: LogicType.BEGGING_THE_QUESTION,
        name: 'Begging the Question',
        description: 'A form of argument where the conclusion is assumed in one of the premises.',
        class: LogicClass.FALLACY,
        category: LogicCategory.PRESUMPTION
    },
    [LogicType.FALSE_DILEMMA]: {
        type: LogicType.FALSE_DILEMMA,
        name: 'False Dilemma',
        description: 'Presenting two options as the only possibilities, when in fact more exist.',
        class: LogicClass.FALLACY,
        category: LogicCategory.PRESUMPTION
    },
    [LogicType.NO_TRUE_SCOTSMAN]: {
        type: LogicType.NO_TRUE_SCOTSMAN,
        name: 'No True Scotsman',
        description: 'Making an ad hoc attempt to retain an unreasoned assertion by modifying the subject to exclude a counterexample.',
        class: LogicClass.FALLACY,
        category: LogicCategory.PRESUMPTION
    },

    // Causal Fallacies
    [LogicType.POST_HOC]: {
        type: LogicType.POST_HOC,
        name: 'Post Hoc Ergo Propter Hoc',
        description: 'Assuming that because Event B followed Event A, Event A must have caused Event B.',
        class: LogicClass.FALLACY,
        category: LogicCategory.CAUSAL
    },
    [LogicType.SLIPPERY_SLOPE]: {
        type: LogicType.SLIPPERY_SLOPE,
        name: 'Slippery Slope',
        description: 'Asserting that a relatively small first step will inevitably lead to a chain of related negative events.',
        class: LogicClass.FALLACY,
        category: LogicCategory.CAUSAL
    },
    [LogicType.HASTY_GENERALIZATION]: {
        type: LogicType.HASTY_GENERALIZATION,
        name: 'Hasty Generalization',
        description: 'Making a rush conclusion without considering all of the variables.',
        class: LogicClass.FALLACY,
        category: LogicCategory.CAUSAL
    },

    // Deductive Reasoning
    [LogicType.CATEGORICAL_SYLLOGISM]: {
        type: LogicType.CATEGORICAL_SYLLOGISM,
        name: 'Categorical Syllogism',
        description: 'A valid deductive argument having two premises and a conclusion.',
        class: LogicClass.FORMAL_ARGUMENT,
        category: LogicCategory.DEDUCTIVE
    },
    [LogicType.MODUS_PONENS]: {
        type: LogicType.MODUS_PONENS,
        name: 'Modus Ponens',
        description: 'Affirming the antecedent (If P, then Q. P is true. Therefore, Q is true).',
        class: LogicClass.FORMAL_ARGUMENT,
        category: LogicCategory.DEDUCTIVE
    },
    [LogicType.MODUS_TOLLENS]: {
        type: LogicType.MODUS_TOLLENS,
        name: 'Modus Tollens',
        description: 'Denying the consequent (If P, then Q. Q is not true. Therefore, P is not true).',
        class: LogicClass.FORMAL_ARGUMENT,
        category: LogicCategory.DEDUCTIVE
    },

    // Inductive Reasoning
    [LogicType.GENERALIZATION]: {
        type: LogicType.GENERALIZATION,
        name: 'Generalization',
        description: 'Drawing a general conclusion from a set of specific observations.',
        class: LogicClass.FORMAL_ARGUMENT,
        category: LogicCategory.INDUCTIVE
    },
    [LogicType.ANALOGY]: {
        type: LogicType.ANALOGY,
        name: 'Analogy',
        description: 'Arguing that because two things are similar in some respects, they are likely similar in others.',
        class: LogicClass.FORMAL_ARGUMENT,
        category: LogicCategory.INDUCTIVE
    },
    [LogicType.ABDUCTION]: {
        type: LogicType.ABDUCTION,
        name: 'Abduction',
        description: 'Inference to the best explanation.',
        class: LogicClass.FORMAL_ARGUMENT,
        category: LogicCategory.INDUCTIVE
    }
};
