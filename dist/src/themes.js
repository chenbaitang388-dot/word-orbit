// Add a theme here with a unique id; learning data is independent of visual style.
// Future themes may supply fonts, accent colors, illustrations and per-page copy.
export const THEMES = {
  space: { id:'space', name:'宇宙探索', tag:'TO THE NEXT WORD', icon:'orbit', color:'#a9a0ff', description:'驾驶你的飞船，把每个单词变成一颗星。', greeting:'准备好，探索更大的世界。', hero:'下一个单词，\n就是你的新星球。', location:'星际航线', currency:'星能', partner:'星际领航员', background:'#101528' },
  island: { id:'island', name:'可爱小岛', tag:'GROW A LITTLE EVERY DAY', icon:'leaf', color:'#3a8978', description:'和小伙伴一起，让单词在小岛上慢慢发芽。', greeting:'今天，也有一点小小的进步。', hero:'种下一颗单词，\n长出一片新世界。', location:'小岛探险', currency:'星星', partner:'小岛探险家', background:'#f7f5ed' },
};
export const REWARDS = [
  {id:'first',title:'第一次出发',desc:'认真学习第一个单词',need:1,kind:'words',icon:'flag'},
  {id:'ten',title:'单词收藏家',desc:'累计学习 10 个不同的单词',need:10,kind:'words',icon:'book'},
  {id:'fifty',title:'闪耀新星',desc:'累计获得 50 星能',need:50,kind:'xp',icon:'star'},
  {id:'streak',title:'三日探险家',desc:'连续学习 3 天',need:3,kind:'streak',icon:'flame'},
  {id:'master',title:'记忆小高手',desc:'通过间隔复习掌握 10 个词',need:10,kind:'mastered',icon:'trophy'},
  {id:'hundred',title:'宇宙收藏家',desc:'累计学习 100 个不同的单词',need:100,kind:'words',icon:'planet'},
];
