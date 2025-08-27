export const rulesJson =
  [
    // === МАТЕРИАЛЫ ===
    {
      "result": "plank",
      "resultTitle": "Доска",
      "ingredients": [{ "name": "wood", "title": "Дерево", "amount": 2 }]
    },
    {
      "result": "stick",
      "resultTitle": "Палка",
      "ingredients": [{ "name": "wood", "title": "Дерево", "amount": 1 }]
    },
    {
      "result": "rope",
      "resultTitle": "Верёвка",
      "ingredients": [{ "name": "fiber", "title": "Волокно", "amount": 3 }]
    },
    {
      "result": "cloth",
      "resultTitle": "Ткань",
      "ingredients": [{ "name": "cotton", "title": "Хлопок", "amount": 2 }]
    },
    {
      "result": "leather",
      "resultTitle": "Кожа",
      "ingredients": [{ "name": "hide", "title": "Шкура", "amount": 1 }],
      "requires": [{ "name": "hammer", "title": "Молоток" }]
    },
    {
      "result": "iron_ingot",
      "resultTitle": "Железный слиток",
      "ingredients": [{ "name": "iron_ore", "title": "Железная руда", "amount": 3 }],
      "requires": [{ "name": "furnace", "title": "Печь" }]
    },
    {
      "result": "bronze_ingot",
      "resultTitle": "Бронзовый слиток",
      "ingredients": [
        { "name": "copper_ore", "title": "Медная руда", "amount": 2 },
        { "name": "tin_ore", "title": "Оловянная руда", "amount": 2 }
      ],
      "requires": [{ "name": "furnace", "title": "Печь" }]
    },
    {
      "result": "glass",
      "resultTitle": "Стекло",
      "ingredients": [{ "name": "sand", "title": "Песок", "amount": 3 }],
      "requires": [{ "name": "furnace", "title": "Печь" }]
    },
    {
      "result": "brick",
      "resultTitle": "Кирпич",
      "ingredients": [{ "name": "clay", "title": "Глина", "amount": 2 }],
      "requires": [{ "name": "furnace", "title": "Печь" }]
    },
    {
      "result": "paper",
      "resultTitle": "Бумага",
      "ingredients": [{ "name": "reed", "title": "Тростник", "amount": 2 }]
    },

    // === ПРЕДМЕТЫ ===
    {
      "result": "sword",
      "resultTitle": "Меч",
      "ingredients": [
        { "name": "iron_ingot", "title": "Железный слиток", "amount": 2 },
        { "name": "plank", "title": "Доска", "amount": 1 }
      ]
    },
    {
      "result": "axe",
      "resultTitle": "Топор",
      "ingredients": [
        { "name": "iron_ingot", "title": "Железный слиток", "amount": 1 },
        { "name": "stick", "title": "Палка", "amount": 2 }
      ]
    },
    {
      "result": "bow",
      "resultTitle": "Лук",
      "ingredients": [
        { "name": "stick", "title": "Палка", "amount": 2 },
        { "name": "rope", "title": "Верёвка", "amount": 1 }
      ]
    },
    {
      "result": "shield",
      "resultTitle": "Щит",
      "ingredients": [
        { "name": "plank", "title": "Доска", "amount": 3 },
        { "name": "iron_ingot", "title": "Железный слиток", "amount": 1 }
      ]
    },
    {
      "result": "armor",
      "resultTitle": "Броня",
      "ingredients": [
        { "name": "leather", "title": "Кожа", "amount": 4 },
        { "name": "cloth", "title": "Ткань", "amount": 2 }
      ]
    },
    {
      "result": "book",
      "resultTitle": "Книга",
      "ingredients": [
        { "name": "paper", "title": "Бумага", "amount": 3 },
        { "name": "leather", "title": "Кожа", "amount": 1 }
      ]
    },
    {
      "result": "bottle",
      "resultTitle": "Бутылка",
      "ingredients": [{ "name": "glass", "title": "Стекло", "amount": 2 }]
    },
    {
      "result": "pottery",
      "resultTitle": "Горшок",
      "ingredients": [{ "name": "clay", "title": "Глина", "amount": 3 }],
      "requires": [{ "name": "furnace", "title": "Печь" }]
    },
    {
      "result": "helmet",
      "resultTitle": "Шлем",
      "ingredients": [{ "name": "bronze_ingot", "title": "Бронзовый слиток", "amount": 2 }]
    },
    {
      "result": "map",
      "resultTitle": "Карта",
      "ingredients": [
        { "name": "paper", "title": "Бумага", "amount": 2 },
        { "name": "cloth", "title": "Ткань", "amount": 1 }
      ]
    },
    {
      "result": "pickaxe",
      "resultTitle": "Кирка",
      "ingredients": [
        { "name": "iron_ingot", "title": "Железный слиток", "amount": 2 },
        { "name": "stick", "title": "Палка", "amount": 2 }
      ]
    },
    {
      "result": "torch",
      "resultTitle": "Факел",
      "ingredients": [
        { "name": "stick", "title": "Палка", "amount": 1 },
        { "name": "fiber", "title": "Волокно", "amount": 1 }
      ]
    },
    {
      "result": "lantern",
      "resultTitle": "Фонарь",
      "ingredients": [
        { "name": "glass", "title": "Стекло", "amount": 1 },
        { "name": "iron_ingot", "title": "Железный слиток", "amount": 1 }
      ]
    },
    {
      "result": "bed",
      "resultTitle": "Кровать",
      "ingredients": [
        { "name": "plank", "title": "Доска", "amount": 4 },
        { "name": "cloth", "title": "Ткань", "amount": 2 }
      ]
    },
    {
      "result": "table",
      "resultTitle": "Стол",
      "ingredients": [
        { "name": "plank", "title": "Доска", "amount": 3 },
        { "name": "stick", "title": "Палка", "amount": 4 }
      ]
    },
    {
      "result": "chair",
      "resultTitle": "Стул",
      "ingredients": [
        { "name": "plank", "title": "Доска", "amount": 2 },
        { "name": "stick", "title": "Палка", "amount": 2 }
      ]
    },
    {
      "result": "furnace",
      "resultTitle": "Печь",
      "ingredients": [
        { "name": "stone", "title": "Камень", "amount": 8 },
        { "name": "brick", "title": "Кирпич", "amount": 2 }
      ]
    },
    {
      "result": "hammer",
      "resultTitle": "Молоток",
      "ingredients": [
        { "name": "stick", "title": "Палка", "amount": 1 },
        { "name": "iron_ingot", "title": "Железный слиток", "amount": 1 }
      ]
    },
    {
      "result": "bowstring",
      "resultTitle": "Тетива",
      "ingredients": [{ "name": "fiber", "title": "Волокно", "amount": 2 }]
    },
    {
      "result": "crossbow",
      "resultTitle": "Арбалет",
      "ingredients": [
        { "name": "plank", "title": "Доска", "amount": 3 },
        { "name": "iron_ingot", "title": "Железный слиток", "amount": 2 },
        { "name": "bowstring", "title": "Тетива", "amount": 1 }
      ]
    },
    // === Материалы (новые) ===
    {
      "result": "gold_ingot",
      "resultTitle": "Золотой слиток",
      "ingredients": [
        { "name": "gold_ore", "title": "Золотая руда", "amount": 3 }
      ],
      "requires": [
        { "name": "furnace", "title": "Печь" }
      ]
    },

    // === Инструменты и станки ===
    {
      "result": "anvil",
      "resultTitle": "Наковальня",
      "ingredients": [
        { "name": "iron_ingot", "title": "Железный слиток", "amount": 5 }
      ]
    },

    // === Еда ===
    {
      "result": "bread",
      "resultTitle": "Хлеб",
      "ingredients": [
        { "name": "wheat", "title": "Пшеница", "amount": 3 }
      ]
    },
    {
      "result": "meat_stew",
      "resultTitle": "Мясное рагу",
      "ingredients": [
        { "name": "meat", "title": "Мясо", "amount": 2 },
        { "name": "herb", "title": "Трава", "amount": 1 }
      ]
    },
    {
      "result": "potion",
      "resultTitle": "Зелье",
      "ingredients": [
        { "name": "herb", "title": "Трава", "amount": 3 },
        { "name": "bottle", "title": "Бутылка", "amount": 1 }
      ]
    },

    // === Украшения ===
    {
      "result": "ring",
      "resultTitle": "Кольцо",
      "ingredients": [
        { "name": "gold_ingot", "title": "Золотой слиток", "amount": 1 }
      ],
      "requires": [
        { "name": "anvil", "title": "Наковальня" }
      ]
    },
    {
      "result": "amulet",
      "resultTitle": "Амулет",
      "ingredients": [
        { "name": "gold_ingot", "title": "Золотой слиток", "amount": 2 },
        { "name": "cloth", "title": "Ткань", "amount": 1 }
      ],
      "requires": [
        { "name": "anvil", "title": "Наковальня" }
      ]
    },

    // === Дополнительное оружие ===
    {
      "result": "dagger",
      "resultTitle": "Кинжал",
      "ingredients": [
        { "name": "iron_ingot", "title": "Железный слиток", "amount": 1 },
        { "name": "stick", "title": "Палка", "amount": 1 }
      ]
    },
    {
      "result": "mace",
      "resultTitle": "Дубина",
      "ingredients": [
        { "name": "iron_ingot", "title": "Железный слиток", "amount": 2 },
        { "name": "stick", "title": "Палка", "amount": 1 }
      ]
    },
    {
      "result": "spear",
      "resultTitle": "Копьё",
      "ingredients": [
        { "name": "iron_ingot", "title": "Железный слиток", "amount": 1 },
        { "name": "stick", "title": "Палка", "amount": 2 }
      ]
    },

    // === Дополнительная мебель ===
    {
      "result": "bookshelf",
      "resultTitle": "Книжная полка",
      "ingredients": [
        { "name": "plank", "title": "Доска", "amount": 6 },
        { "name": "book", "title": "Книга", "amount": 2 }
      ]
    },
    {
      "result": "cabinet",
      "resultTitle": "Шкаф",
      "ingredients": [
        { "name": "plank", "title": "Доска", "amount": 5 },
        { "name": "iron_ingot", "title": "Железный слиток", "amount": 1 }
      ]
    },
    {
      "result": "bench",
      "resultTitle": "Скамья",
      "ingredients": [
        { "name": "plank", "title": "Доска", "amount": 3 },
        { "name": "stick", "title": "Палка", "amount": 2 }
      ]
    },

    // === Светильники ===
    {
      "result": "candle",
      "resultTitle": "Свеча",
      "ingredients": [
        { "name": "wax", "title": "Воск", "amount": 1 },
        { "name": "stick", "title": "Палка", "amount": 1 }
      ]
    },
    {
      "result": "torch_lit",
      "resultTitle": "Зажжённый факел",
      "ingredients": [
        { "name": "torch", "title": "Факел", "amount": 1 },
        { "name": "coal", "title": "Уголь", "amount": 1 }
      ]
    },

    // === Дополнительные инструменты ===
    {
      "result": "shovel",
      "resultTitle": "Лопата",
      "ingredients": [
        { "name": "iron_ingot", "title": "Железный слиток", "amount": 1 },
        { "name": "stick", "title": "Палка", "amount": 2 }
      ]
    },
    {
      "result": "scythe",
      "resultTitle": "Коса",
      "ingredients": [
        { "name": "iron_ingot", "title": "Железный слиток", "amount": 2 },
        { "name": "stick", "title": "Палка", "amount": 1 }
      ]
    },

    // === Алхимические материалы ===
    {
      "result": "herbal_mix",
      "resultTitle": "Травяная смесь",
      "ingredients": [
        { "name": "herb", "title": "Трава", "amount": 3 },
        { "name": "cloth", "title": "Ткань", "amount": 1 }
      ]
    },
    {
      "result": "healing_potion",
      "resultTitle": "Исцеляющее зелье",
      "ingredients": [
        { "name": "herbal_mix", "title": "Травяная смесь", "amount": 1 },
        { "name": "bottle", "title": "Бутылка", "amount": 1 }
      ]
    },

    // === Декоративные предметы ===
    {
      "result": "flower_vase",
      "resultTitle": "Ваза с цветами",
      "ingredients": [
        { "name": "pottery", "title": "Горшок", "amount": 1 },
        { "name": "reed", "title": "Тростник", "amount": 2 }
      ]
    },
    {
      "result": "painting",
      "resultTitle": "Картина",
      "ingredients": [
        { "name": "paper", "title": "Бумага", "amount": 2 },
        { "name": "paint", "title": "Краска", "amount": 1 }
      ]
    }
  ]
