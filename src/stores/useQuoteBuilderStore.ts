// src/stores/useQuoteBuilderStore.ts
import { create } from 'zustand';
import { Quote, QuoteLine, UserProfile, CombinedTask, CombinedMaterial, MaterialOption } from '../types';
import { doc, getDoc, collection, getDocs, query, orderBy, Timestamp, setDoc, addDoc, updateDoc, writeBatch, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { v4 as uuidv4 } from 'uuid';

interface QuoteBuilderState {
  // Quote State
  quote: Partial<Quote>;
  lines: QuoteLine[];
  status: 'idle' | 'loading' | 'saving' | 'error';
  isEditing: boolean;
  error: string | null;

  // Form/UI State for Step 2
  activeSection: string;
  selectedTask: CombinedTask | null;
  selectedMaterial: CombinedMaterial | null;
  selectedOption: MaterialOption | null;
  selectedQuantity: number;
  overrideRate: string;
  selectedDescription: string;

  // Actions
  loadQuote: (quoteId: string, userId: string) => Promise<void>;
  createNewQuote: (profile: UserProfile | null) => void;
  updateQuoteHeader: (data: Partial<Quote>) => void;
  setLines: (lines: QuoteLine[]) => void;
  addLine: (line: Omit<QuoteLine, 'id' | 'order' | 'lineTotal'>, calculatedTotal: number) => void;
  removeLine: (lineId: string) => void;
  reset: () => void;
  saveQuote: (userId: string, profile: UserProfile | null) => Promise<string | undefined>;
  
  // Actions for Step 2 Form
  setActiveSection: (section: string) => void;
  setSelectedTask: (task: CombinedTask | null) => void;
  setSelectedMaterial: (material: CombinedMaterial | null) => void;
  setSelectedOption: (option: MaterialOption | null) => void;
  setSelectedQuantity: (qty: number) => void;
  setOverrideRate: (rate: string) => void;
  setSelectedDescription: (desc: string) => void;
  clearItemSelections: () => void;
}

const initialState = {
  quote: {},
  lines: [],
  status: 'idle' as 'idle' | 'loading' | 'saving' | 'error',
  isEditing: false,
  error: null,
  activeSection: 'Main Area',
  selectedTask: null,
  selectedMaterial: null,
  selectedOption: null,
  selectedQuantity: 1,
  overrideRate: '',
  selectedDescription: '',
};

export const useQuoteBuilderStore = create<QuoteBuilderState>((set, get) => ({
  ...initialState,

  reset: () => set(initialState),

  createNewQuote: (profile) => set({
    ...initialState,
    quote: {
      status: 'Draft',
      quoteNumber: `${profile?.quotePrefix || 'QT'}-${String(profile?.nextQuoteSequence || 1).padStart(4, '0')}`,
      totalAmount: 0,
      terms: profile?.defaultTerms || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
  }),

  loadQuote: async (quoteId, userId) => {
    set({ status: 'loading', error: null });
    try {
      const quoteRef = doc(db, `users/${userId}/quotes`, quoteId);
      const quoteSnap = await getDoc(quoteRef);
      if (quoteSnap.exists()) {
        const linesQuery = query(collection(db, `users/${userId}/quotes/${quoteId}/quoteLines`), orderBy('order'));
        const linesSnap = await getDocs(linesQuery);
        const linesData = linesSnap.docs.map(d => ({ id: d.id, ...d.data() } as QuoteLine));
        set({ quote: quoteSnap.data() as Quote, lines: linesData, isEditing: true, status: 'idle' });
      } else {
        throw new Error("Quote not found.");
      }
    } catch (e: any) {
      set({ status: 'error', error: e.message });
    }
  },

  updateQuoteHeader: (data) => set(state => ({ quote: { ...state.quote, ...data } })),

  setLines: (newLines) => {
    const totalAmount = newLines.reduce((acc, line) => acc + (line.lineTotal || 0), 0);
    set(state => ({
      lines: newLines,
      quote: { ...state.quote, totalAmount },
    }));
  },

  addLine: (line, calculatedTotal) => {
    const { lines } = get();
    const newLine = {
      ...line,
      id: uuidv4(),
      order: lines.length > 0 ? Math.max(...lines.map(l => l.order)) + 1 : 0,
      lineTotal: calculatedTotal
    } as QuoteLine;
    get().setLines([...lines, newLine]);
  },

  // FIX: Added the missing removeLine implementation
  removeLine: (lineId: string) => {
    const { lines } = get();
    const newLines = lines.filter(l => l.id !== lineId);
    get().setLines(newLines);
  },

  // --- Actions for Step 2 Form ---
  setActiveSection: (section) => set({ activeSection: section }),
  setSelectedTask: (task) => set({ selectedTask: task, selectedMaterial: null, selectedOption: null }),
  setSelectedMaterial: (material) => set({ selectedMaterial: material, selectedTask: null, selectedOption: null }),
  setSelectedOption: (option) => set({ selectedOption: option }),
  setSelectedQuantity: (qty) => set({ selectedQuantity: qty }),
  setOverrideRate: (rate) => set({ overrideRate: rate }),
  setSelectedDescription: (desc) => set({ selectedDescription: desc }),
  clearItemSelections: () => set({
    selectedTask: null,
    selectedMaterial: null,
    selectedOption: null,
    selectedQuantity: 1,
    overrideRate: '',
    selectedDescription: ''
  }),
  
  // --- Save Action ---
  saveQuote: async (userId, profile) => {
    set({ status: 'saving', error: null });
    const { quote, lines, isEditing } = get();

    try {
      let quoteId = quote.id;
      const quotePayload = {
          ...quote,
          totalAmount: lines.reduce((acc, line) => acc + (line.lineTotal || 0), 0),
          updatedAt: serverTimestamp(),
      };

      if (isEditing && quoteId) {
        await setDoc(doc(db, `users/${userId}/quotes`, quoteId), quotePayload, { merge: true });
      } else {
        const profileRef = doc(db, 'users', userId);
        const finalQuoteNumber = await runTransaction(db, async (transaction) => {
            const profileSnap = await transaction.get(profileRef);
            if (!profileSnap.exists()) throw new Error("User profile not found for quote numbering.");
            const currentProfile = profileSnap.data() as UserProfile;
            const nextNum = currentProfile.nextQuoteSequence || 1;
            const newNumStr = `${currentProfile.quotePrefix || 'QT-'}${String(nextNum).padStart(4, '0')}`;
            transaction.update(profileRef, { nextQuoteSequence: nextNum + 1 });
            return newNumStr;
        });
        
        const newQuoteRef = await addDoc(collection(db, `users/${userId}/quotes`), {
            ...quotePayload,
            quoteNumber: finalQuoteNumber,
            userId: userId,
            createdAt: serverTimestamp(),
        });
        quoteId = newQuoteRef.id;
      }

      if (!quoteId) throw new Error("Could not get a valid Quote ID to save line items.");

      const batch = writeBatch(db);
      const linesSubColRef = collection(db, 'users', userId, 'quotes', quoteId, 'quoteLines');
      
      if (isEditing) {
          const oldLinesSnap = await getDocs(query(linesSubColRef));
          oldLinesSnap.forEach(lineDoc => batch.delete(lineDoc.ref));
      }

      lines.forEach(line => {
        const { id, ...dataToSave } = line;
        const newLineDocRef = doc(linesSubColRef, id); // Use our client-side ID
        batch.set(newLineDocRef, dataToSave);
      });
      
      await batch.commit();

      set({ status: 'idle' });
      await get().loadQuote(quoteId, userId); 
      return quoteId;

    } catch (e: any) {
      set({ status: 'error', error: e.message });
      return undefined;
    }
  },
}));