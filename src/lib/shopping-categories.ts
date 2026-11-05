const rules:Array<[string,string[]]>=[
 ["Obst & Gemüse",["apfel","banane","birne","beere","tomate","gurke","salat","kartoffel","zwiebel","karotte","möhre","paprika","brokkoli","zucchini","obst","gemüse","knoblauch","avocado"]],
 ["Backwaren",["brot","brötchen","toast","croissant","baguette","kuchen","brezel"]],
 ["Milchprodukte & Eier",["milch","joghurt","quark","käse","butter","sahne","ei","eier","frischkäse"]],
 ["Fleisch & Fisch",["fleisch","hähnchen","huhn","rind","schwein","hack","wurst","schinken","lachs","fisch","thunfisch"]],
 ["Getränke",["wasser","saft","cola","limonade","kaffee","tee","bier","getränk"]],
 ["Tiefkühl",["tk ","tiefkühl","pizza","eis","pommes"]],
 ["Vorrat & Konserven",["nudel","reis","mehl","zucker","öl","essig","dose","konserve","tomatenmark","müsli","haferflocken"]],
 ["Drogerie",["shampoo","zahnpasta","seife","duschgel","deo","waschmittel","spülmittel","windel","toilettenpapier","taschentuch"]],
 ["Haushalt",["müllbeutel","batterie","lampe","reiniger","schwamm","küchenrolle"]]
];
export function suggestShoppingCategory(title:string):string{
 const value=title.toLocaleLowerCase("de-DE");
 for(const [category,keywords] of rules)if(keywords.some(keyword=>value.includes(keyword)))return category;
 return "Sonstiges";
}
export const shoppingCategoryOrder=["Obst & Gemüse","Backwaren","Milchprodukte & Eier","Fleisch & Fisch","Getränke","Tiefkühl","Vorrat & Konserven","Drogerie","Haushalt","Sonstiges"];
