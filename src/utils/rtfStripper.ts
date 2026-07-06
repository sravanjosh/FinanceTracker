/**
 * Utility to strip RTF formatting and convert it to clean plain text.
 * Especially handles tabular markers like \cell and \row to preserve structure,
 * and decodes RTF unicode sequences (e.g., \u2344) and hex characters.
 */
export function stripRTF(rtf: string): string {
  if (!rtf || typeof rtf !== 'string') return '';
  
  const trimmed = rtf.trim();
  // Check if it is actually RTF format
  if (!trimmed.startsWith('{\\rtf') && !trimmed.includes('\\rtf1')) {
    return rtf; // Not RTF, return as-is
  }

  let text = rtf;

  // 1. Remove font table, color table, stylesheet, list table, info groups, etc.
  // These groups are enclosed in curly braces and start with control words.
  text = text.replace(/\{\\*?(?:fonttbl|colortbl|stylesheet|info|listtable|listoverride|generator)[^}]*\}/g, '');

  // 2. Preserve table layout: replace \cell with a clean column separator (tab or pipe)
  // and \row / \lastrow\row with newlines.
  text = text.replace(/\\cell/g, '  |  ');
  text = text.replace(/\\row/g, '\n');

  // 3. Handle RTF unicode characters: \uN followed by a replacement character or format parameter
  text = text.replace(/\\uc[0-9]+/g, '');
  
  // Replace \u2344 or \u2344? or \u2344'?? with actual unicode characters
  text = text.replace(/\\u([0-9\-]{2,5})\s*(\??|\'?[0-9a-fA-F]{2})?/g, (match, code) => {
    try {
      const charCode = parseInt(code, 10);
      if (charCode >= 0) {
        return String.fromCharCode(charCode);
      }
    } catch (e) {}
    return '';
  });

  // 4. Handle hex escaped characters (e.g., \'e1 or \'3f)
  text = text.replace(/\\\'([0-9a-fA-F]{2})/g, (match, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch (e) {}
    return '';
  });

  // 5. Remove any other remaining control words starting with backslash
  text = text.replace(/\\[a-zA-Z0-9]+-?[0-9]*\s?/g, ' ');

  // 6. Clean up braces group syntax (leftover group symbols)
  text = text.replace(/[{}]/g, ' ');

  // 7. Standardize newlines and white spaces
  const lines = text.split('\n');
  const cleanedLines = lines
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .filter(line => line.length > 0);

  return cleanedLines.join('\n');
}

/**
 * Prunes completely unnecessary boilerplate sections from CAS statement text
 * (like pages of disclaimers, how-to-get-CAS, about CDSL/NSDL, chatbot guides).
 * This dramatically reduces token size by 80-90%, preventing Gemini timeouts.
 */
export function pruneCasText(text: string): string {
  if (!text || typeof text !== 'string') return '';

  // 1. Convert to lines for processing
  const lines = text.split('\n');
  const prunedLines: string[] = [];

  // Keywords that signal the start of appendix/notes/boilerplate sections.
  // Since holdings are ALWAYS at the beginning of the CAS statement, 
  // we can safely truncate the entire text once we hit these headers.
  const truncationKeywords = [
    'notes to cas',
    'notes on cas',
    'about cdsl',
    'about nsdl',
    'cdsl के बारे म',
    'cas के लए टपणयां',
    'highlights of some of the facilities',
    'how to register',
    'e locker facility',
    'e-voting system',
    'cdsl chatbot',
    'to file a grievance',
    'smart odr'
  ];

  // Specific repetitive boilerplate lines to filter out
  const boilerplateRegexes = [
    /Central Depository Services/i,
    /Marathon Futurex, Mafatlal Mills/i,
    /Lower Parel \(E\), Mumbai/i,
    /लोअर परेल \(पूव\), मुंबई/i,
    /मैराथन यूचुरेस, मफतलाल/i,
    /CONSOLIDATED ACCOUNT STATEMENT/i,
    /FORM AND INVESTMENTS IN MUTUAL FUNDS/i,
    /समेकत खाता ववरण/i,
    /Attention: SEBI vide its circular/i,
    /यान द: SEBI ने अपने परप/i,
    /CIR\/MRD\/DP\/31\/2014/i,
    /For any queries regarding demat account/i,
    /खाता ववरण के बारे म कसी पूछता/i
  ];

  for (let line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check for truncation keywords
    const lowerLine = trimmedLine.toLowerCase();
    const shouldTruncate = truncationKeywords.some(keyword => lowerLine.includes(keyword));
    if (shouldTruncate) {
      console.log(`Pruning CAS text: Truncating at boilerplate header "${trimmedLine}"`);
      break; // Stop adding lines, we reached the boilerplate appendix!
    }

    // Check for repetitive boilerplate lines
    const isBoilerplate = boilerplateRegexes.some(regex => regex.test(trimmedLine));
    if (isBoilerplate) {
      continue; // Skip this line
    }

    prunedLines.push(trimmedLine);
  }

  const prunedText = prunedLines.join('\n');
  return prunedText;
}
