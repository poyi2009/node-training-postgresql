const express = require('express');
const router = express.Router();

const skill = require('../controllers/skill');

//取得技能列表
router.get('/', skill.getSkill)
//新增技能
router.post('/', skill.postSkill)
//刪除技能
router.delete('/:skillId', skill.deleteSkill)

module.exports = router